/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/unbound-method */
import chunk from 'lodash.chunk';
import remove from 'lodash.remove';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { newCrmClient, CrmClient } from '../crm/crmClient';
import { TarsTestResultModel } from '../crm/testResults/tarsTestResultModel';
import { TarsResultType } from '../tars/result';
import validateSchema, { validateTarsTestResult } from '../validation/validateSchema';
import { newTarsMetadataService, TarsMetadataService } from '../metadata/tarsMetadataService';
import { newTarsMetadataClient, TarsMetadataClient } from '../metadata/tarsMetadataClient';
import { newXmlTestResultsFileGenerator, XmlTestResultsFileGenerator } from '../tars/xmlTestResultsFileGenerator';
import { newAzureFilesClient, AzureFilesClient } from '../azureFiles/azureFilesClient';
import { BasicTarsMetadata, TarsMetadata } from '../metadata/metadata';
import config from '../config';
import { TarsResultsDispatcherError } from './tarsResultsDispatcherError';
import { TarsExportedStatus } from '../crm/testResults/tarsExportedStatus';
import { generateMD5Checksum } from '../utils/generateMd5Checksum';
import { getCorrespondingProductNumber } from '../utils/getCorrespondingProductNumber';
import { CRMProductNumber } from '../crm/testResults/productNumber';
import { resolveTitle } from '../tars/title';
import { resolveGender } from '../tars/gender';

const BATCH_SIZE = 100;

export class TarsResultsDispatcher {
  private tarsShareName: string;

  constructor(
    private crmClient: CrmClient,
    private metadataService: TarsMetadataService,
    private metadataClient: TarsMetadataClient,
    private testResultsFileGenerator: XmlTestResultsFileGenerator,
    private filesClient: AzureFilesClient,
  ) {
    this.tarsShareName = config.tars.azureFiles.tarsShareName;
  }

  public async dispatchResults(): Promise<void> {
    const testResults: TarsTestResultModel[] = await this.crmClient.getUnprocessedTestResults();
    await this.processResults(testResults, TarsResultType.RESULT);

    const negatedTestResults: TarsTestResultModel[] = await this.crmClient.getUnprocessedNegatedTestResults();
    await this.processResults(negatedTestResults, TarsResultType.NEGATED_RESULT);
  }

  private async processResults(results: TarsTestResultModel[], resultType: TarsResultType): Promise<void> {
    for (const result of results) {
      await this.resolveCorrespondingTestResult(result, results);
      result.title = resolveTitle(result.title, result.genderCode);
      result.genderCode = resolveGender(result.title, result.genderCode, result.driverNumber);
    }
    const malformedResults: TarsTestResultModel[] = remove(results, this.isInvalidTestResult);
    if (malformedResults.length !== 0) {
      logger.warn(`TarsResultsDispatcher::processResults: ${malformedResults.length} malformed result record/s found`);
    }

    if (results.length !== 0) {
      const basicMetadata: BasicTarsMetadata = await this.metadataService.prepareNewBasicMetadata();
      const resultsFile: string = this.testResultsFileGenerator.createFile(results, basicMetadata, resultType);
      const resultsFileName: string = this.testResultsFileGenerator.createFileName(basicMetadata, resultType);
      const fileChecksum: string = generateMD5Checksum(resultsFile);
      const metadataFile: TarsMetadata = {
        fileName: resultsFileName,
        checksum: fileChecksum,
        numberOfRows: results.length,
        ...basicMetadata,
      };
      await this.metadataClient.uploadMetadataFile(metadataFile);
      await this.uploadTestResultsFile(resultsFileName, resultsFile, fileChecksum);

      await this.updateTestResultsTarsExportedStatus(results, TarsExportedStatus.PROCESSED, new Date());
      logger.event(BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_UPLOAD_SUCCESSFUL, 'TarsResultsDispatcher::processResults: Successfully uploaded results file', {
        fileName: resultsFileName,
        shareName: this.tarsShareName,
      });
    }
    await this.updateTestResultsTarsExportedStatus(malformedResults, TarsExportedStatus.FAILED_VALIDATION);
  }

  private async resolveCorrespondingTestResult(result: TarsTestResultModel, results: TarsTestResultModel[]): Promise<void> {
    if (result.productNumber === CRMProductNumber.LGVMC || result.productNumber === CRMProductNumber.LGVHPT
      || result.productNumber === CRMProductNumber.PCVMC || result.productNumber === CRMProductNumber.PCVHPT) {
      const correspondingProductNumber = getCorrespondingProductNumber(result?.productNumber);

      if (correspondingProductNumber && result.personId) {
        const correspondingResults = await this.crmClient.getTarsCorrespondingTestResults(result.personId, correspondingProductNumber);

        if (correspondingResults.length > 0) {
          if (correspondingResults[0].startTime) {
            logger.info('TarsResultsDispatcher::resolveCorrespondingTestResult: Setting result date from corresponding test history\'s', {
              correspondingResult: correspondingResults[0],
              originalDateTime: result.startTime,
              correspondingDateTime: correspondingResults[0].startTime.toISOString(),
            });
            result.startTime = correspondingResults[0].startTime.toISOString();
          } else if (correspondingResults[0].testDate) {
            logger.info('TarsResultsDispatcher::resolveCorrespondingTestResult: Setting result date from corresponding booking product test date\'s', {
              correspondingResult: correspondingResults[0],
              originalDateTime: result.startTime,
              correspondingDateTime: correspondingResults[0].testDate.toISOString(),
            });
            result.startTime = correspondingResults[0].testDate.toISOString();
          } else {
            logger.event(
              BusinessTelemetryEvent.RES_TARS_CORRESPONDING_TEST_HISTORY_MISSING_START_TIME_AND_BOOKING_PRODUCT_TESTDATE_ERROR,
              'TarsResultsDispatcher::resolveCorrespondingTestResult: Booking product test date and test history start time are undefined',
              {
                testHistoryId: result.id,
                candidateId: result.personId,
                productNumber: result.productNumber,
              },
            );
          }
        } else {
          logger.event(
            BusinessTelemetryEvent.RES_TARS_CORRESPONDING_TEST_NOT_FOUND_ERROR,
            'TarsResultsDispatcher::resolveCorrespondingTestResult: No previous test history found for result - corresponding test history needed for test date',
            {
              testHistoryId: result.id,
              candidateId: result.personId,
              productNumber: result.productNumber,
            },
          );
          remove(results, (testResult) => testResult.id === result.id);
        }
      }
    }
  }

  private isInvalidTestResult(testResult: TarsTestResultModel): boolean {
    const validationErrors = validateSchema(validateTarsTestResult, testResult as unknown as Record<string, unknown>);
    if (validationErrors) {
      logger.event(
        BusinessTelemetryEvent.RES_TARS_SCHEMA_VALIDATION_ERROR,
        'TarsResultsDispatcher::isInvalidTestResult: Result record schema validation failed',
        {
          testHistoryId: testResult.id,
          bookingReference: testResult.bookingReference,
          validationErrors,
        },
      );
      return true;
    }
    return false;
  }

  private async uploadTestResultsFile(resultsFileName: string, resultsFile: string, fileChecksum: string): Promise<void> {
    try {
      await this.filesClient.uploadFile(this.tarsShareName, resultsFileName, resultsFile);
      await this.verifyUploadedResultFile(resultsFileName, fileChecksum);
    } catch (error) {
      throw new TarsResultsDispatcherError('TarsResultsDispatcher::uploadTestResultsFile: Failed to upload results file', error, {
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        fileName: resultsFileName,
        shareName: this.tarsShareName,
      });
    }
  }

  private async verifyUploadedResultFile(fileName: string, fileChecksum: string): Promise<void> {
    const properties = {
      fileName,
      shareName: this.tarsShareName,
    };
    const buffer: Buffer = await this.filesClient.downloadFile(this.tarsShareName, fileName);
    const downloadedResultFile = buffer.toString();
    if (generateMD5Checksum(downloadedResultFile) !== fileChecksum) {
      try {
        await this.filesClient.deleteFile(this.tarsShareName, fileName);
      } catch (error) {
        logger.error(new TarsResultsDispatcherError('TarsResultsDispatcher::verifyUploadedResultFile: Failed to delete invalid results file', error, properties));
      }
      throw new TarsResultsDispatcherError('TarsResultsDispatcher::verifyUploadedResultFile: Uploaded results file is invalid');
    }
  }

  private async updateTestResultsTarsExportedStatus(testResults: TarsTestResultModel[], tarsExportedStatus: TarsExportedStatus, tarsExportedDate?: Date): Promise<void> {
    const chunkedResults = chunk(testResults, BATCH_SIZE);
    for (let index = 0, limit = chunkedResults.length; index < limit; index++) {
      // eslint-disable-next-line security/detect-object-injection
      await this.crmClient.updateTarsExportedStatuses(chunkedResults[index], tarsExportedStatus, tarsExportedDate);
    }
  }
}

export const newTarsResultsDispatcher = (unprocessedStatus: string): TarsResultsDispatcher => new TarsResultsDispatcher(
  newCrmClient(unprocessedStatus),
  newTarsMetadataService(),
  newTarsMetadataClient(),
  newXmlTestResultsFileGenerator(),
  newAzureFilesClient(),
);
