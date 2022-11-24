import * as JEST_DATE_MOCK from 'jest-date-mock';
import each from 'jest-each';
import { mock } from 'jest-mock-extended';
import { CRMProductNumber } from '@dvsa/ftts-crm-test-client/dist/enums';
import { when } from 'jest-when';
import { mocked } from 'ts-jest/utils';
import { generateMD5Checksum } from '../../../src/utils/generateMd5Checksum';
import { AzureFilesClient, newAzureFilesClient } from '../../../src/azureFiles/azureFilesClient';
import { TarsResultsDispatcherError } from '../../../src/tarsResultsDispatcher/tarsResultsDispatcherError';
import { CrmClient, newCrmClient } from '../../../src/crm/crmClient';
import { CrmGenderCode } from '../../../src/crm/testResults/genderCode';
import { TarsExportedStatus } from '../../../src/crm/testResults/tarsExportedStatus';
import { TarsTestResultModel } from '../../../src/crm/testResults/tarsTestResultModel';
import { TestStatus } from '../../../src/crm/testResults/testStatus';
import { TextLanguage } from '../../../src/crm/testResults/textLanguage';
import { CrmTitle } from '../../../src/crm/testResults/title';
import { newTarsMetadataClient, TarsMetadataClient } from '../../../src/metadata/tarsMetadataClient';
import { newTarsMetadataService, TarsMetadataService } from '../../../src/metadata/tarsMetadataService';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { TarsResultType } from '../../../src/tars/result';
import { newXmlTestResultsFileGenerator, XmlTestResultsFileGenerator } from '../../../src/tars/xmlTestResultsFileGenerator';
import { newTarsResultsDispatcher, TarsResultsDispatcher } from '../../../src/tarsResultsDispatcher/tarsResultsDispatcher';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';

jest.mock('../../../src/observability/logger');

jest.mock('../../../src/utils/generateMd5Checksum');
const mockedMd5Checksum = mocked(generateMD5Checksum);

jest.mock('../../../src/crm/crmClient');
const mockedCrmClient = mock<CrmClient>();
const mockedNewCrmClient = mocked(newCrmClient);

jest.mock('../../../src/metadata/tarsMetadataService');
const mockedMetadataService = mock<TarsMetadataService>();
const mockedNewMetadataService = mocked(newTarsMetadataService);

jest.mock('../../../src/metadata/tarsMetadataClient');
const mockedMetadataClient = mock<TarsMetadataClient>();
const mockedNewMetadataClient = mocked(newTarsMetadataClient);

jest.mock('../../../src/tars/xmlTestResultsFileGenerator');
const mockedTestResultsFileGenerator = mock<XmlTestResultsFileGenerator>();
const mockedNewTestResultsFileGenerator = mocked(newXmlTestResultsFileGenerator);

jest.mock('../../../src/azureFiles/azureFilesClient');
const mockedAzureFilesClient = mock<AzureFilesClient>();
const mockedNewAzureFilesClient = mocked(newAzureFilesClient);

let tarsResultsDispatcher: TarsResultsDispatcher;

const xmlFileContent = '<xml>test</xml>';
const xmlFileName = 'test.xml';
const xmlFileChecksum = 'test';
const xmlFileContentNegated = '<xml>test negated</xml>';
const xmlFileNameNegated = 'test2.xml';
const xmlFileChecksumNegated = 'test negated';
const basicMetadata = {
  sequenceNumber: 1000000,
  dailySequenceNumber: '001',
  created: new Date('2020-01-01'),
};
const tarsShareName = 'tars';
const properties = {
  fileName: xmlFileName,
  shareName: tarsShareName,
};
const TARS_EXPORTED_DATE = new Date('2020-08-01T00:00:00.000Z');
const unprocessedStatus = 'something';

describe('TarsResultsDispatcher', () => {
  beforeEach(() => {
    JEST_DATE_MOCK.advanceTo(TARS_EXPORTED_DATE);
    mockedConfig.tars.azureFiles.tarsShareName = tarsShareName;
    when(mockedNewCrmClient).calledWith(unprocessedStatus).mockReturnValue(mockedCrmClient);
    when(mockedNewMetadataService).calledWith().mockReturnValue(mockedMetadataService);
    when(mockedNewMetadataClient).calledWith().mockReturnValue(mockedMetadataClient);
    when(mockedNewAzureFilesClient).calledWith().mockReturnValue(mockedAzureFilesClient);
    when(mockedNewTestResultsFileGenerator).calledWith().mockReturnValue(mockedTestResultsFileGenerator);
    tarsResultsDispatcher = newTarsResultsDispatcher(unprocessedStatus);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('GIVEN both regular and negated results WHEN dispatchResults THEN proper xml test results and negated test results files are uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([validNegatedTestResult]);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validNegatedTestResult], basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileContentNegated);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileNameNegated);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContentNegated)
      .mockReturnValue(xmlFileChecksumNegated);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileNameNegated)
      .mockResolvedValue(Buffer.from(xmlFileContentNegated));

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(2);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(2);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(2);
    expect(mockedMd5Checksum).toHaveBeenCalledTimes(4);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenNthCalledWith(
      1,
      {
        fileName: xmlFileName,
        checksum: xmlFileChecksum,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenNthCalledWith(
      2,
      {
        fileName: xmlFileNameNegated,
        checksum: xmlFileChecksumNegated,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedAzureFilesClient.uploadFile).toHaveBeenNthCalledWith(
      1,
      tarsShareName,
      xmlFileName,
      xmlFileContent,
    );
    expect(mockedAzureFilesClient.uploadFile).toHaveBeenNthCalledWith(
      2,
      tarsShareName,
      xmlFileNameNegated,
      xmlFileContentNegated,
    );
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(2);
    expect(mockedLogger.event).toHaveBeenCalledTimes(2);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(2);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
      [validTestResult],
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
  });

  test('GIVEN regular result WHEN dispatchResults THEN proper xml test results file is uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(1);
    expect(mockedMd5Checksum).toHaveBeenCalledTimes(2);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledWith(
      {
        fileName: xmlFileName,
        checksum: xmlFileChecksum,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedAzureFilesClient.uploadFile).toHaveBeenCalledWith(
      tarsShareName,
      xmlFileName,
      xmlFileContent,
    );
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
      [validTestResult],
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
  });

  test('GIVEN regular LGV/PCV result WHEN dispatchResults THEN proper xml test results file is uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([{
      ...validTestResult,
      productNumber: CRMProductNumber.LGVMC,
      personId: 'mockCandidateId',
    }]);
    jest.spyOn(mockedCrmClient, 'getTarsCorrespondingTestResults').mockResolvedValue([{
      testHistoryId: 'correspondingId',
      bookingProductReference: 'mockBookingProductRef',
      testStatus: TestStatus.PASS,
      startTime: new Date('2020-06-26T00:00:00.000Z'),
      productNumber: CRMProductNumber.LGVHPT,
      candidateId: 'mockCandidateId',
      testDate: new Date('2020-11-11T14:30:45.979Z'),
    }]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    mockedMd5Checksum.mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(1);
    expect(mockedMd5Checksum).toHaveBeenCalledTimes(2);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledWith(
      {
        fileName: xmlFileName,
        checksum: xmlFileChecksum,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
      [{
        ...validTestResult,
        startTime: '2020-06-26T00:00:00.000Z',
        personId: 'mockCandidateId',
        productNumber: CRMProductNumber.LGVMC,
      }],
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
  });

  test('GIVEN regular LGV/PCV result with no corresponding tests WHEN dispatchResults THEN log an event', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([{
      ...validTestResult,
      productNumber: CRMProductNumber.LGVMC,
      personId: 'mockCandidateId',
    }]);
    jest.spyOn(mockedCrmClient, 'getTarsCorrespondingTestResults').mockResolvedValue([]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    mockedMd5Checksum.mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_CORRESPONDING_TEST_NOT_FOUND_ERROR,
      'TarsResultsDispatcher::resolveCorrespondingTestResult: No previous test history found for result - corresponding test history needed for test date',
      {
        candidateId: 'mockCandidateId',
        productNumber: '3001',
        testHistoryId: 'aede37df-73d1-ea11-a813-000d3a7f128d',
      },
    );
  });

  test('GIVEN multi-part test result WHEN the corresponding test history startTime is undefined THEN use the testDate from the booking product is used.', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([{
      ...validTestResult,
      productNumber: CRMProductNumber.LGVMC,
      personId: 'mockCandidateId',
    }]);
    jest.spyOn(mockedCrmClient, 'getTarsCorrespondingTestResults').mockResolvedValue([{
      testHistoryId: 'correspondingId',
      bookingProductReference: 'mockBookingProductRef',
      testStatus: TestStatus.PASS,
      startTime: undefined as unknown as Date,
      productNumber: CRMProductNumber.LGVHPT,
      candidateId: 'mockCandidateId',
      testDate: new Date('2020-11-11T14:30:45.979Z'),
    },
    ]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    mockedMd5Checksum.mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('TarsResultsDispatcher::resolveCorrespondingTestResult: Setting result date from corresponding booking product test date\'s', {
      correspondingResult: {
        bookingProductReference: 'mockBookingProductRef',
        candidateId: 'mockCandidateId',
        productNumber: '3002',
        startTime: undefined,
        testDate: new Date('2020-11-11T14:30:45.979Z'),
        testHistoryId: 'correspondingId',
        testStatus: 2,
      },
      originalDateTime: '2020-06-26T00:00:00.000Z',
      correspondingDateTime: '2020-11-11T14:30:45.979Z',
    });
    // expect(mockedLogger.event).toHaveBeenCalledWith(
    //   BusinessTelemetryEvent.RES_TARS_CORRESPONDING_TEST_HISTORY_MISSING_START_TIME_AND_BOOKING_PRODUCT_TESTDATE_ERROR,
    //   'TarsResultsDispatcher::resolveCorrespondingTestResult:Booking product test date and test history start time are undefined',
    //   {
    //     candidateId: 'mockCandidateId',
    //     productNumber: '3001',
    //     testHistoryId: 'aede37df-73d1-ea11-a813-000d3a7f128d',
    //   },
    // );
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(1);
    expect(mockedMd5Checksum).toHaveBeenCalledTimes(2);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledWith(
      {
        fileName: xmlFileName,
        checksum: xmlFileChecksum,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
      [{
        ...validTestResult,
        startTime: '2020-11-11T14:30:45.979Z',
        personId: 'mockCandidateId',
        productNumber: CRMProductNumber.LGVMC,
      }],
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
  });

  test('GIVEN multi-part test result WHEN the corresponding test history startTime and booking product testDate is undefined THEN given event is called.', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([{
      ...validTestResult,
      productNumber: CRMProductNumber.LGVMC,
      personId: 'mockCandidateId',
    }]);
    jest.spyOn(mockedCrmClient, 'getTarsCorrespondingTestResults').mockResolvedValue([{
      testHistoryId: 'correspondingId',
      bookingProductReference: 'mockBookingProductRef',
      testStatus: TestStatus.PASS,
      startTime: undefined as unknown as Date,
      productNumber: CRMProductNumber.LGVHPT,
      candidateId: 'mockCandidateId',
      testDate: undefined as unknown as Date,
    },
    ]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    mockedMd5Checksum.mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_CORRESPONDING_TEST_HISTORY_MISSING_START_TIME_AND_BOOKING_PRODUCT_TESTDATE_ERROR,
      'TarsResultsDispatcher::resolveCorrespondingTestResult: Booking product test date and test history start time are undefined',
      {
        testHistoryId: 'aede37df-73d1-ea11-a813-000d3a7f128d',
        candidateId: 'mockCandidateId',
        productNumber: '3001',
      },
    );
  });

  test('GIVEN negated result WHEN dispatchResults THEN proper xml negated test results file is uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([]);

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([validNegatedTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validNegatedTestResult], basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileContentNegated);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileNameNegated);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContentNegated)
      .mockReturnValue(xmlFileChecksumNegated);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileNameNegated)
      .mockResolvedValue(Buffer.from(xmlFileContentNegated));

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(1);
    expect(mockedMd5Checksum).toHaveBeenCalledTimes(2);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledWith(
      {
        fileName: xmlFileNameNegated,
        checksum: xmlFileChecksumNegated,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedAzureFilesClient.uploadFile).toHaveBeenCalledWith(
      tarsShareName,
      xmlFileNameNegated,
      xmlFileContentNegated,
    );
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
      [validNegatedTestResult],
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
  });

  test('GIVEN both regular and negated results WHEN dispatchResults THEN proper xml test results and negated test results files are uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([malformedTestResult]);
    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([malformedNegatedTestResult]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(0);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(0);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(0);
    expect(mockedMd5Checksum).toHaveBeenCalledTimes(0);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureFilesClient.uploadFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(0);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(2);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      1,
      [malformedTestResult],
      TarsExportedStatus.FAILED_VALIDATION,
      undefined,
    );
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      2,
      [malformedNegatedTestResult],
      TarsExportedStatus.FAILED_VALIDATION,
      undefined,
    );
  });

  test('GIVEN malformed result with invalid booking reference WHEN dispatchResults THEN malformed result is not exported and CRM status is updated', async () => {
    const mockMalformedTestResult = { ...validTestResult };
    mockMalformedTestResult.bookingReference = 'invalid-format';
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([mockMalformedTestResult]);
    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(0);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      1,
      [mockMalformedTestResult],
      TarsExportedStatus.FAILED_VALIDATION,
      undefined,
    );
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_SCHEMA_VALIDATION_ERROR,
      'TarsResultsDispatcher::isInvalidTestResult: Result record schema validation failed',
      {
        testHistoryId: mockMalformedTestResult.id,
        bookingReference: mockMalformedTestResult.bookingReference,
        validationErrors: [expect.objectContaining({ dataPath: '.bookingReference' })],
      },
    );
  });

  test('GIVEN malformed result with invalid gender code WHEN dispatchResults THEN malformed result is not exported and CRM status is updated', async () => {
    const mockMalformedTestResult = { ...malformedTestResultWithGenderCodeEmpty };
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([mockMalformedTestResult]);
    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await tarsResultsDispatcher.dispatchResults();

    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(0);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      1,
      [mockMalformedTestResult],
      TarsExportedStatus.FAILED_VALIDATION,
      undefined,
    );
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_SCHEMA_VALIDATION_ERROR,
      'TarsResultsDispatcher::isInvalidTestResult: Result record schema validation failed',
      {
        testHistoryId: mockMalformedTestResult.id,
        bookingReference: mockMalformedTestResult.bookingReference,
        validationErrors: [expect.objectContaining({ errorMessage: 'should have required property \'genderCode\'' })],
      },
    );
  });

  test('GIVEN regular result WHEN dispatchResults failed during upload results file THEN proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    const resultsUploadError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestResult, malformedTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChecksum);
    mockedAzureFilesClient.uploadFile.mockRejectedValueOnce(resultsUploadError);

    try {
      await tarsResultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(TarsResultsDispatcherError);
      expect((error as TarsResultsDispatcherError).message).toEqual('TarsResultsDispatcher::uploadTestResultsFile: Failed to upload results file');
      expect((error as TarsResultsDispatcherError).cause).toEqual(resultsUploadError);
      expect((error as TarsResultsDispatcherError).properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular result WHEN dispatchResults and error during download results file for checksum verification failed THEN proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    const resultsDownloadError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestResult, malformedTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockRejectedValue(resultsDownloadError);

    try {
      await tarsResultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(TarsResultsDispatcherError);
      expect((error as TarsResultsDispatcherError).message).toEqual('TarsResultsDispatcher::uploadTestResultsFile: Failed to upload results file');
      expect((error as TarsResultsDispatcherError).cause).toEqual(resultsDownloadError);
      expect((error as TarsResultsDispatcherError).properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular result WHEN dispatchResults and uploaded results file has wrong cheksum THEN file is deleted and proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestResult, malformedTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from('invalid file content'));

    try {
      await tarsResultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(TarsResultsDispatcherError);
      expect((error as TarsResultsDispatcherError).message).toEqual('TarsResultsDispatcher::uploadTestResultsFile: Failed to upload results file');
      expect((error as TarsResultsDispatcherError).cause).toEqual(new TarsResultsDispatcherError('TarsResultsDispatcher::verifyUploadedResultFile: Uploaded results file is invalid'));
      expect((error as TarsResultsDispatcherError).properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
      expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledWith(
        tarsShareName,
        xmlFileName,
      );
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular result WHEN dispatchResults, uploaded results file has wrong cheksum and failed delete invalid file THEN proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    const resultsDeleteError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestResult, malformedTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from('invalid file content'));
    when(mockedAzureFilesClient.deleteFile)
      .expectCalledWith(tarsShareName, xmlFileName)
      .mockRejectedValue(resultsDeleteError);

    try {
      await tarsResultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(TarsResultsDispatcherError);
      expect((error as TarsResultsDispatcherError).message).toEqual('TarsResultsDispatcher::uploadTestResultsFile: Failed to upload results file');
      expect((error as TarsResultsDispatcherError).cause).toEqual(new TarsResultsDispatcherError('TarsResultsDispatcher::verifyUploadedResultFile: Uploaded results file is invalid'));
      expect((error as TarsResultsDispatcherError).properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new TarsResultsDispatcherError('TarsResultsDispatcher::verifyUploadedResultFile: Failed to delete invalid results file', resultsDeleteError, properties),
      );
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(0);
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular and negated result WHEN dispatchResults, uploaded negated results file has wrong cheksum and failed delete invalid file THEN regular test results file uploaded correctly and proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event for negated results', async () => {
    const resultsDownloadError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestResult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChecksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([validNegatedTestResult]);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validNegatedTestResult], basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileContentNegated);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileNameNegated);
    when(mockedMd5Checksum)
      .calledWith(xmlFileContentNegated)
      .mockReturnValue(xmlFileChecksumNegated);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileNameNegated)
      .mockRejectedValue(resultsDownloadError);

    try {
      await tarsResultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(TarsResultsDispatcherError);
      expect((error as TarsResultsDispatcherError).message).toEqual('TarsResultsDispatcher::uploadTestResultsFile: Failed to upload results file');
      expect((error as TarsResultsDispatcherError).cause).toEqual(resultsDownloadError);
      expect((error as TarsResultsDispatcherError).properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...{
          fileName: xmlFileNameNegated,
          shareName: tarsShareName,
        },
      });
    }
    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(2);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(2);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(2);
    expect(mockedMd5Checksum).toHaveBeenCalledTimes(3);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenNthCalledWith(
      1,
      {
        fileName: xmlFileName,
        checksum: xmlFileChecksum,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedAzureFilesClient.uploadFile).toHaveBeenNthCalledWith(
      1,
      tarsShareName,
      xmlFileName,
      xmlFileContent,
    );
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(2);
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_UPLOAD_SUCCESSFUL,
      'TarsResultsDispatcher::processResults: Successfully uploaded results file',
      properties,
    );
  });

  each([
    [
      150,
      20,
      3,
    ],
    [
      70,
      120,
      3,
    ],
    [
      10,
      0,
      1,
    ],
  ]).test('GIVEN valid and malformed test results WHEN dispatchResults THEN proper number of batches are dispatched',
    async (numberofValid: number, numberOfMalformed: number, numberOfBatches: number) => {
      const validResultsArray = new Array(numberofValid).fill(validTestResult);
      const malformedResultsArray = new Array(numberOfMalformed).fill(malformedTestResult);
      mockedCrmClient.getUnprocessedTestResults.mockResolvedValue(validResultsArray.concat(malformedResultsArray));
      mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
      when(mockedTestResultsFileGenerator.createFile)
        .calledWith([validTestResult], basicMetadata, TarsResultType.RESULT)
        .mockReturnValue(xmlFileContent);
      when(mockedTestResultsFileGenerator.createFileName)
        .calledWith(basicMetadata, TarsResultType.RESULT)
        .mockReturnValue(xmlFileName);
      mockedMd5Checksum.mockReturnValue(xmlFileChecksum);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(tarsShareName, xmlFileName)
        .mockResolvedValue(Buffer.from(xmlFileContent));

      mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

      await tarsResultsDispatcher.dispatchResults();

      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(numberOfBatches);
    });
});

const validTestResult = new TarsTestResultModel({
  ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
  ftts_certificatenumber: '999999999',
  ftts_teststatus: TestStatus.FAIL,
  ftts_textlanguage: TextLanguage.ENGLISH,
  ftts_starttime: new Date('2020-06-26'),
  'person.address1_line1': 'adress line 1',
  'person.address1_line2': 'address line 2',
  'person.address1_line3': 'address line 3',
  'person.address1_city': 'address city',
  'person.address1_county': 'address county',
  'person.address1_postalcode': 'postalcode',
  'person.ftts_adiprn': '1',
  'person.gendercode': CrmGenderCode.FEMALE,
  'person.ftts_title': CrmTitle.Miss,
  'person.ftts_othertitle': 'other',
  'person.firstname': 'Ellie',
  'person.lastname': 'Walker',
  'person.birthdate': '1989-03-12',
  'person.licence.ftts_licence': '20406011',
  'product.ftts_examseriescode': 'LGV',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});

const validNegatedTestResult = new TarsTestResultModel({
  ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
  ftts_teststatus: TestStatus.NEGATED,
  ftts_textlanguage: TextLanguage.ENGLISH,
  ftts_starttime: new Date('2020-06-26'),
  'person.address1_line1': 'adress line 1',
  'person.address1_line2': 'address line 2',
  'person.address1_line3': 'address line 3',
  'person.address1_city': 'address city',
  'person.address1_county': 'address county',
  'person.address1_postalcode': 'postalcode',
  'person.ftts_adiprn': '1',
  'person.gendercode': CrmGenderCode.MALE,
  'person.ftts_title': CrmTitle.Mr,
  'person.ftts_othertitle': 'other',
  'person.firstname': 'Nile',
  'person.lastname': 'Johnson',
  'person.birthdate': '1989-03-12',
  'person.licence.ftts_licence': '20406011',
  'product.ftts_examseriescode': 'LGV',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});

const malformedTestResult = new TarsTestResultModel({
  ftts_testhistoryid: '1',
  ftts_certificatenumber: '999999999',
  ftts_teststatus: TestStatus.FAIL,
  ftts_textlanguage: TextLanguage.ENGLISH,
  ftts_starttime: new Date('2020-06-26'),
  'person.ftts_title': CrmTitle.Miss,
  'person.ftts_othertitle': 'other',
  'person.firstname': 'Ellie',
  'person.lastname': 'Walker',
  'person.birthdate': '1989-03-12',
  'product.ftts_examseriescode': 'LGV',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});

const malformedNegatedTestResult = new TarsTestResultModel({
  ftts_testhistoryid: '4',
  ftts_teststatus: TestStatus.NEGATED,
  ftts_starttime: new Date('2020-06-26'),
  'person.address1_line1': 'adress line 1',
  'person.address1_city': 'address city',
  'person.ftts_title': CrmTitle.Mr,
  'person.lastname': 'Johnson',
  'person.birthdate': '1989-03-12',
  'product.ftts_examseriescode': 'Car',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});

const malformedTestResultWithGenderCodeEmpty = new TarsTestResultModel({
  ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
  ftts_certificatenumber: '999999999',
  ftts_teststatus: TestStatus.FAIL,
  ftts_textlanguage: TextLanguage.ENGLISH,
  ftts_starttime: new Date('2020-06-26'),
  'person.address1_line1': 'adress line 1',
  'person.address1_line2': 'address line 2',
  'person.address1_line3': 'address line 3',
  'person.address1_city': 'address city',
  'person.address1_county': 'address county',
  'person.address1_postalcode': 'postalcode',
  'person.ftts_adiprn': '1',
  'person.gendercode': undefined,
  'person.ftts_title': CrmTitle.Miss,
  'person.ftts_othertitle': 'other',
  'person.firstname': 'Ellie',
  'person.lastname': 'Walker',
  'person.birthdate': '1989-03-12',
  'person.licence.ftts_licence': 'JONES031102W97YT',
  'product.ftts_examseriescode': 'LGV',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});
