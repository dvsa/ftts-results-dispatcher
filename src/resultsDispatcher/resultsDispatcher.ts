/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/unbound-method */
import chunk from 'lodash.chunk';
import remove from 'lodash.remove';
import * as schema from '../crm/testResults/testResult.schema.json';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { newCrmClient, CrmClient } from '../crm/crmClient';
import { TestResult } from '../crm/testResults/testResult';
import { TarsResultType } from '../tars/result';
import validateSchema from '../validation/validateSchema';
import { newMetadataService, MetadataService } from '../metadata/metadataService';
import { newMetadataClient, MetadataClient } from '../metadata/metadataClient';
import { newXmlTestResultsFileGenerator, XmlTestResultsFileGenerator } from '../tars/xmlTestResultsFileGenerator';
import { newAzureFilesClient, AzureFilesClient } from '../azureFiles/azureFilesClient';
import { BasicMetadata, Metadata } from '../metadata/metadata';
import config from '../config';
import { AzureFilesError } from '../azureFiles/azureFilesError';
import { TarsExportedStatus } from '../crm/testResults/tarsExportedStatus';

const BATCH_SIZE = 100;

export class ResultsDispatcher {
  private tarsShareName: string;

  constructor(
    private crmClient: CrmClient,
    private metadataService: MetadataService,
    private metadataClient: MetadataClient,
    private testResultsFileGenerator: XmlTestResultsFileGenerator,
    private filesClient: AzureFilesClient,
  ) {
    this.tarsShareName = config.azureFiles.tarsShareName;
  }

  public async dispatchResults(): Promise<void> {
    logger.info('Trying to dispatch results');
    const testResults: TestResult[] = await this.crmClient.getUnprocessedTestResults();
    await this.processResults(testResults, TarsResultType.RESULT);

    logger.info('Trying to dispatch negated results');
    const negatedTestResults: TestResult[] = await this.crmClient.getUnprocessedNegatedTestResults();
    await this.processResults(negatedTestResults, TarsResultType.NEGATED_RESULT);
  }

  private async processResults(results: TestResult[], resultType: TarsResultType): Promise<void> {
    logger.info('Filtering results fetched from CRM');
    const malformedResults: TestResult[] = remove(results, this.isInvalidTestResult);
    if (malformedResults.length !== 0) {
      logger.info(`${malformedResults.length} malformed result record/s found`);
    }

    if (results.length !== 0) {
      const basicMetadata: BasicMetadata = await this.metadataService.prepareNewBasicMetadata();
      const resultsFile: string = this.testResultsFileGenerator.createFile(results, basicMetadata, resultType);
      const resultsFileName: string = this.testResultsFileGenerator.createFileName(basicMetadata, resultType);
      const fileChecksum: string = this.metadataService.generateMD5Checksum(resultsFile);
      const metadataFile: Metadata = {
        fileName: resultsFileName,
        checksum: fileChecksum,
        numberOfRows: results.length,
        ...basicMetadata,
      };
      await this.metadataClient.uploadMetadataFile(metadataFile);
      await this.uploadTestResultsFile(resultsFileName, resultsFile, fileChecksum);

      await this.updateTestResultsTarsExportedStatus(results, TarsExportedStatus.PROCESSED);
      logger.logEvent(
        BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_UPLOAD_SUCCESSFUL,
        'Successfully uploaded results file',
        {
          fileName: resultsFileName,
          shareName: this.tarsShareName,
        },
      );
    }
    await this.updateTestResultsTarsExportedStatus(malformedResults, TarsExportedStatus.FAILED_VALIDATION);
  }

  private isInvalidTestResult(testResult: TestResult): boolean {
    return !validateSchema(schema, testResult);
  }

  private async uploadTestResultsFile(resultsFileName: string, resultsFile: string, fileChecksum: string): Promise<void> {
    try {
      await this.filesClient.uploadFile(this.tarsShareName, resultsFileName, resultsFile);
      await this.verifyUploadedResultFile(resultsFileName, fileChecksum);
    } catch (error) {
      throw new AzureFilesError(
        'Failed to upload results file',
        error,
        {
          event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
          fileName: resultsFileName,
          shareName: this.tarsShareName,
        },
      );
    }
  }

  private async verifyUploadedResultFile(fileName: string, fileChecksum: string): Promise<void> {
    const properties = {
      fileName,
      shareName: this.tarsShareName,
    };
    logger.info('Trying to verify successful results file upload', properties);
    const buffer: Buffer = await this.filesClient.downloadFile(this.tarsShareName, fileName);
    const downloadedResultFile = buffer.toString();
    if (this.metadataService.generateMD5Checksum(downloadedResultFile) !== fileChecksum) {
      logger.info('Uploaded results file is invalid. Trying to delete a file', properties);
      try {
        await this.filesClient.deleteFile(this.tarsShareName, fileName);
      } catch (error) {
        logger.error(new AzureFilesError('Failed to delete invalid results file', error, properties));
      }
      throw new AzureFilesError('Uploaded results file is invalid');
    }
    logger.info('Results file was successfully uploaded', properties);
  }

  private async updateTestResultsTarsExportedStatus(testResults: TestResult[], tarsExportedStatus: TarsExportedStatus): Promise<void> {
    const chunkedResults = chunk(testResults, BATCH_SIZE);
    for (let index = 0; index < chunkedResults.length; index++) {
      // eslint-disable-next-line security/detect-object-injection
      await this.crmClient.updateTarsExportedStatuses(chunkedResults[index], tarsExportedStatus);
    }
  }
}

export const newResultsDispatcher = (): ResultsDispatcher => new ResultsDispatcher(
  newCrmClient(),
  newMetadataService(),
  newMetadataClient(),
  newXmlTestResultsFileGenerator(),
  newAzureFilesClient(),
);
