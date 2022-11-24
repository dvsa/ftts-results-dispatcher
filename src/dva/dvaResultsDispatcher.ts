/* eslint-disable no-await-in-loop */
/* eslint-disable security/detect-object-injection */
import chunk from 'lodash.chunk';
import dayjs from 'dayjs';
import remove from 'lodash.remove';
import { ValidateFunction } from 'ajv';
import { ParseConfigInput } from 'fixed-width-parser';
import { BusinessTelemetryEvent, logger } from '../observability/logger';
import { newCrmClient, CrmClient } from '../crm/crmClient';
import { DvaMetadataService, newDvaMetadataService } from '../metadata/dvaMetadataService';
import validateSchema from '../validation/validateSchema';
import { FixedWidthTextFileGenerator, newFixedWidthTextFileGenerator } from './fixedWidthTextFileGenerator';
import { resolveSftpClient } from './sftp/resolveSftpClient';
import { SftpClient, verifyFileContents } from './sftp/sftpClient';
import { TarsExportedStatus } from '../crm/testResults/tarsExportedStatus';
import { BaseTestResultModel } from '../crm/testResults/baseTestResultModel';
import { DvaTestType, dvaTestTypeToSuccessEventName } from './enums';
import { DvaLearnerResultRecord } from './dvaLearnerResultRecord';
import { DvaBaseResultRecord } from './dvaBaseResultRecord';
import { DvaInstructorResultRecord } from './dvaInstructorResultRecord';
import { zeroFill } from '../utils/string';
import { DateFormat, formatDate } from '../utils/formatDate';
import config from '../config';
import { getCorrespondingProductNumber } from '../utils/getCorrespondingProductNumber';
import { DvaLearnerTestResultModel } from '../crm/testResults/dvaLearnerTestResultModel';
import { CRMProductNumber } from '../crm/testResults/productNumber';

const BATCH_SIZE = 100;

export class DvaResultsDispatcher {
  constructor(
    private crmClient: CrmClient,
    private metadataService: DvaMetadataService,
    private fixedWidthTextFileGenerator: FixedWidthTextFileGenerator,
    private sftpClient: SftpClient,
  ) { }

  private static dvaTestTypeToHeaderConstant = new Map<DvaTestType, string>([
    [DvaTestType.ADI, '3DADIRESUL'],
    [DvaTestType.AMI, '3DAMIRESUL'],
    [DvaTestType.LEARNER, 'DVTARESUL'],
  ]);

  public async dispatchResults(testType: DvaTestType, metadataFilename: string, validateFunction: ValidateFunction): Promise<void> {
    const results: BaseTestResultModel[] = await this.retrieveResultsBasedOnTestType(testType);
    logger.debug('DvaResultsDispatcher::dispatchResults: Results loaded from CRM:', {
      results,
    });

    const sequenceNumber = await this.metadataService.getNextSequenceNumber(metadataFilename, testType);
    logger.info(`DvaResultsDispatcher::dispatchResults: Retrieved next sequence number: ${sequenceNumber}`, { sequenceNumber });

    const malformedResults: BaseTestResultModel[] = remove(results, (testResult) => this.isInvalidTestResult(validateFunction, testResult));

    if (malformedResults.length > 0) {
      logger.event(BusinessTelemetryEvent.RES_DVA_ROW_PROCESSING_ERROR, `DvaResultsDispatcher::dispatchResults: Found ${malformedResults.length} malformed test results`);
      logger.debug('DvaResultsDispatcher::dispatchResults: malformed results payload', { malformedResults });
      await this.updateTestResultsTarsExportedStatus(malformedResults, TarsExportedStatus.FAILED_VALIDATION);
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const result of results) {
      if (result.productNumber === CRMProductNumber.LGVMC || result.productNumber === CRMProductNumber.LGVHPT
        || result.productNumber === CRMProductNumber.PCVMC || result.productNumber === CRMProductNumber.PCVHPT) {
        const correspondingProductNumber = getCorrespondingProductNumber((result as DvaLearnerTestResultModel).productNumber);

        if (correspondingProductNumber && result.personId) {
          const correspondingResults = await this.crmClient.getDvaCorrespondingTestResults(result.personId, correspondingProductNumber);

          if (correspondingResults.length > 0) {
            logger.info('DvaResultsDispatcher::dispatchResults: Setting result date from corresponding test history\'s', {
              correspondingResult: correspondingResults[0],
              originalDateTime: result.startTime,
              correspondingDateTime: correspondingResults[0].startTime.toISOString(),
            });
            result.startTime = correspondingResults[0].startTime.toISOString();
          } else {
            logger.event(
              BusinessTelemetryEvent.RES_DVA_CORRESPONDING_TEST_NOT_FOUND_ERROR,
              'DvaResultsDispatcher::dispatchResults: No previous test history found for result - corresponding test history needed for test date',
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

    logger.debug('DvaResultsDispatcher::dispatchResults: Remaining results payload', { results });

    const resultsFolderPath = (testType === DvaTestType.LEARNER) ? config.dva.sftp.learnerPath : config.dva.sftp.instructorPath;

    const files = await this.retrieveListOfFilesBasedOnDateOfTestTaken(testType, resultsFolderPath);

    const resultsFileName = FixedWidthTextFileGenerator.createFileName(sequenceNumber, testType, files);
    const resultsFileContent = this.getResultsFileContent(results, testType, sequenceNumber);

    // Attempt to upload to SFTP (Azure Blob or DVA SFTP).
    const resultsFilePath = `${resultsFolderPath}/${resultsFileName}`;
    await this.sftpClient.putFile(resultsFilePath, resultsFileContent);
    await verifyFileContents(resultsFilePath, resultsFileContent, this.sftpClient);

    await this.metadataService.updateSequenceNumber(metadataFilename, sequenceNumber);
    await this.updateTestResultsTarsExportedStatus(results, TarsExportedStatus.PROCESSED, dayjs().toDate());

    const eventName = dvaTestTypeToSuccessEventName.get(testType) as BusinessTelemetryEvent;
    logger.event(eventName, 'DvaResultsDispatcher::dispatchResults: Successfully uploaded results file to SFTP server', {
      resultsFileName,
      sequenceNumber,
    });
  }

  private isInvalidTestResult(validateFunction: ValidateFunction, testResult: BaseTestResultModel): boolean {
    const validationErrors = validateSchema(validateFunction, testResult as unknown as Record<string, unknown>);
    if (validationErrors) {
      logger.event(
        BusinessTelemetryEvent.RES_DVA_SCHEMA_VALIDATION_ERROR,
        'DvaResultsDispatcher::isInvalidTestResult: Result record schema validation failed',
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

  private getResultsFileContent(results: BaseTestResultModel[], testType: DvaTestType, sequenceNumber: number): string {
    const constant = DvaResultsDispatcher.dvaTestTypeToHeaderConstant.get(testType) as string;
    const yesterday = dayjs().subtract(1, 'day').toDate();
    const fileDate = formatDate(yesterday, DateFormat.ddmmyyyy) as string;

    let records: DvaBaseResultRecord[];
    let headerParams: Record<string, string>;
    if (testType === DvaTestType.ADI || testType === DvaTestType.AMI) {
      records = results.map((testResult) => new DvaInstructorResultRecord(testResult));
      headerParams = {
        constant,
        fileSequence: zeroFill(sequenceNumber, 6),
        fileDate,
        numberOfRecords: zeroFill(records.length, 6),
      };
    } else {
      records = results.map((testResult) => new DvaLearnerResultRecord(testResult));
      headerParams = {
        constant,
        fileSequence: zeroFill(sequenceNumber, 6),
        numberOfRecords: zeroFill(records.length, 6),
      };
    }
    return this.fixedWidthTextFileGenerator.createFile(records, headerParams);
  }

  private async updateTestResultsTarsExportedStatus(testResults: BaseTestResultModel[], tarsExportedStatus: TarsExportedStatus, tarsExportedDate?: Date): Promise<void> {
    const chunkedResults = chunk(testResults, BATCH_SIZE);
    for (let index = 0, limit = chunkedResults.length; index < limit; index++) {
      await this.crmClient.updateTarsExportedStatuses(chunkedResults[index], tarsExportedStatus, tarsExportedDate);
    }
  }

  private retrieveResultsBasedOnTestType = async (testType: DvaTestType): Promise<BaseTestResultModel[]> => {
    if (testType === DvaTestType.LEARNER) {
      return this.crmClient.getDvaUnprocessedTestResults();
    }
    if (testType === DvaTestType.ADI) {
      return this.crmClient.getDvaAdiUnprocessedTestResults();
    }
    if (testType === DvaTestType.AMI) {
      return this.crmClient.getDvaAmiUnprocessedTestResults();
    }
    throw new Error('Unknown test type');
  };

  private retrieveListOfFilesBasedOnDateOfTestTaken = async (testType: DvaTestType, resultsFolderPath: string): Promise<string[] | undefined> => {
    if (testType !== DvaTestType.LEARNER) {
      return undefined;
    }

    const yesterday = dayjs().subtract(1, 'day').toDate();
    const dateFormat = DateFormat.yyyyMMdd;
    const yesterdayToString = formatDate(
      yesterday,
      dateFormat,
    ) as string;

    const files = await this.sftpClient.listFiles(resultsFolderPath, `DVTA${yesterdayToString}`);
    return files;
  };
}

export const newDvaResultsDispatcher = (
  dvaHeaderTemplate: ParseConfigInput[],
  dvaRecordTemplate: ParseConfigInput[],
  unprocessedStatus: string,
): DvaResultsDispatcher => new DvaResultsDispatcher(
  newCrmClient(unprocessedStatus),
  newDvaMetadataService(),
  newFixedWidthTextFileGenerator(dvaHeaderTemplate, dvaRecordTemplate),
  resolveSftpClient(),
);
