import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import each from 'jest-each';
import { mockedLogger } from '../../mocks/logger.mock';
import { mockedConfig } from '../../mocks/config.mock';
import { TestResult } from '../../../src/crm/testResults/testResult';
import { Title } from '../../../src/crm/testResults/title';
import { TestStatus } from '../../../src/crm/testResults/testStatus';
import { TextLanguage } from '../../../src/crm/testResults/textLanguage';
import { GenderCode } from '../../../src/crm/testResults/genderCode';
import { CrmClient, newCrmClient } from '../../../src/crm/crmClient';
import { MetadataService, newMetadataService } from '../../../src/metadata/metadataService';
import { MetadataClient, newMetadataClient } from '../../../src/metadata/metadataClient';
import { AzureFilesClient, newAzureFilesClient } from '../../../src/azureFiles/azureFilesClient';
import { XmlTestResultsFileGenerator, newXmlTestResultsFileGenerator } from '../../../src/tars/xmlTestResultsFileGenerator';
import { ResultsDispatcher, newResultsDispatcher } from '../../../src/resultsDispatcher/resultsDispatcher';
import { TarsResultType } from '../../../src/tars/result';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { AzureFilesError } from '../../../src/azureFiles/azureFilesError';
import { TarsExportedStatus } from '../../../src/crm/testResults/tarsExportedStatus';

jest.mock('../../../src/observability/logger');

jest.mock('../../../src/crm/crmClient');
const mockedCrmClient = mock<CrmClient>();
const mockedNewCrmClient = mocked(newCrmClient);

jest.mock('../../../src/metadata/metadataService');
const mockedMetadataService = mock<MetadataService>();
const mockedNewMetadataService = mocked(newMetadataService);

jest.mock('../../../src/metadata/metadataClient');
const mockedMetadataClient = mock<MetadataClient>();
const mockedNewMetadataClient = mocked(newMetadataClient);

jest.mock('../../../src/tars/xmlTestResultsFileGenerator');
const mockedTestResultsFileGenerator = mock<XmlTestResultsFileGenerator>();
const mockedNewTestResultsFileGenerator = mocked(newXmlTestResultsFileGenerator);

jest.mock('../../../src/azureFiles/azureFilesClient');
const mockedAzureFilesClient = mock<AzureFilesClient>();
const mockedNewAzureFilesClient = mocked(newAzureFilesClient);

let resultsDispatcher: ResultsDispatcher;

const xmlFileContent = '<xml>test</xml>';
const xmlFileName = 'test.xml';
const xmlFileChcksum = 'test';
const xmlFileContentNegated = '<xml>test negated</xml>';
const xmlFileNameNegated = 'test2.xml';
const xmlFileChcksumNegated = 'test negated';
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

describe('ResultsDispatcher', () => {
  beforeEach(() => {
    mockedConfig.azureFiles.tarsShareName = tarsShareName;
    when(mockedNewCrmClient).calledWith().mockReturnValue(mockedCrmClient);
    when(mockedNewMetadataService).calledWith().mockReturnValue(mockedMetadataService);
    when(mockedNewMetadataClient).calledWith().mockReturnValue(mockedMetadataClient);
    when(mockedNewAzureFilesClient).calledWith().mockReturnValue(mockedAzureFilesClient);
    when(mockedNewTestResultsFileGenerator).calledWith().mockReturnValue(mockedTestResultsFileGenerator);
    resultsDispatcher = newResultsDispatcher();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('GIVEN both regular and negated results WHEN disptchResults THEN proper xml test results and negated test results files are uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChcksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([validNegatedTestRusult]);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validNegatedTestRusult], basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileContentNegated);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileNameNegated);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContentNegated)
      .mockReturnValue(xmlFileChcksumNegated);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileNameNegated)
      .mockResolvedValue(Buffer.from(xmlFileContentNegated));

    await resultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(2);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(2);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(2);
    expect(mockedMetadataService.generateMD5Checksum).toHaveBeenCalledTimes(4);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenNthCalledWith(
      1,
      {
        fileName: xmlFileName,
        checksum: xmlFileChcksum,
        numberOfRows: 1,
        ...basicMetadata,
      },
    );
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenNthCalledWith(
      2,
      {
        fileName: xmlFileNameNegated,
        checksum: xmlFileChcksumNegated,
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
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(2);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
      [validTestRusult],
      TarsExportedStatus.PROCESSED,
    );
  });

  test('GIVEN regular result WHEN disptchResults THEN proper xml test results file is uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChcksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

    await resultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.generateMD5Checksum).toHaveBeenCalledTimes(2);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledWith(
      {
        fileName: xmlFileName,
        checksum: xmlFileChcksum,
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
      [validTestRusult],
      TarsExportedStatus.PROCESSED,
    );
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
  });

  test('GIVEN negated result WHEN disptchResults THEN proper xml negated test results file is uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([]);

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([validNegatedTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validNegatedTestRusult], basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileContentNegated);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileNameNegated);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContentNegated)
      .mockReturnValue(xmlFileChcksumNegated);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileNameNegated)
      .mockResolvedValue(Buffer.from(xmlFileContentNegated));

    await resultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(1);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.generateMD5Checksum).toHaveBeenCalledTimes(2);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledWith(
      {
        fileName: xmlFileNameNegated,
        checksum: xmlFileChcksumNegated,
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
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
      [validNegatedTestRusult],
      TarsExportedStatus.PROCESSED,
    );
  });

  test('GIVEN both regular and negated results WHEN disptchResults THEN proper xml test results and negated test results files are uploaded', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([malformedTestRusult]);
    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([malformedNegatedTestRusult]);

    await resultsDispatcher.dispatchResults();

    expect(mockedCrmClient.getUnprocessedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(1);
    expect(mockedMetadataService.prepareNewBasicMetadata).toHaveBeenCalledTimes(0);
    expect(mockedTestResultsFileGenerator.createFile).toHaveBeenCalledTimes(0);
    expect(mockedTestResultsFileGenerator.createFileName).toHaveBeenCalledTimes(0);
    expect(mockedMetadataService.generateMD5Checksum).toHaveBeenCalledTimes(0);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureFilesClient.uploadFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(0);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(2);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      1,
      [malformedTestRusult],
      TarsExportedStatus.FAILED_VALIDATION,
    );
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      2,
      [malformedNegatedTestRusult],
      TarsExportedStatus.FAILED_VALIDATION,
    );
  });

  test('GIVEN regular result WHEN disptchResults failed during upload results file THEN proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    const resultsUploadError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestRusult, malformedTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChcksum);
    mockedAzureFilesClient.uploadFile.mockRejectedValueOnce(resultsUploadError);

    try {
      await resultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(AzureFilesError);
      expect(error.message).toEqual('Failed to upload results file');
      expect(error.cause).toEqual(resultsUploadError);
      expect(error.properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular result WHEN disptchResults and error during download results file for checksum verification failed THEN proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    const resultsDownloadError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestRusult, malformedTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChcksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockRejectedValue(resultsDownloadError);

    try {
      await resultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(AzureFilesError);
      expect(error.message).toEqual('Failed to upload results file');
      expect(error.cause).toEqual(resultsDownloadError);
      expect(error.properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular result WHEN disptchResults and uploaded results file has wrong cheksum THEN file is deleted and proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestRusult, malformedTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChcksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from('invalid file content'));

    try {
      await resultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(AzureFilesError);
      expect(error.message).toEqual('Failed to upload results file');
      expect(error.cause).toEqual(new AzureFilesError('Uploaded results file is invalid'));
      expect(error.properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
      expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledWith(
        tarsShareName,
        xmlFileName,
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Uploaded results file is invalid. Trying to delete a file',
        properties,
      );
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular result WHEN disptchResults, uploaded results file has wrong cheksum and failed delete invalid file THEN proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event', async () => {
    const resultsDeleteError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestRusult, malformedTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChcksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from('invalid file content'));
    when(mockedAzureFilesClient.deleteFile)
      .expectCalledWith(tarsShareName, xmlFileName)
      .mockRejectedValue(resultsDeleteError);

    try {
      await resultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(AzureFilesError);
      expect(error.message).toEqual('Failed to upload results file');
      expect(error.cause).toEqual(new AzureFilesError('Uploaded results file is invalid'));
      expect(error.properties).toEqual({
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_STORE_ERROR,
        ...properties,
      });
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Uploaded results file is invalid. Trying to delete a file',
        properties,
      );
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new AzureFilesError('Failed to delete invalid results file', resultsDeleteError, properties),
      );
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(0);
    }
    expect(mockedCrmClient.getUnprocessedNegatedTestResults).toHaveBeenCalledTimes(0);
  });

  test('GIVEN regular and negated result WHEN disptchResults, uploaded negated results file has wrong cheksum and failed delete invalid file THEN regular test results file uploaded correctly and proper error with RES_TARS_RESULTS_FILE_STORE_ERROR event for negated results', async () => {
    const resultsDownloadError = new Error('original error msg');
    mockedCrmClient.getUnprocessedTestResults.mockResolvedValue([validTestRusult]);
    mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileContent);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.RESULT)
      .mockReturnValue(xmlFileName);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContent)
      .mockReturnValue(xmlFileChcksum);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileName)
      .mockResolvedValue(Buffer.from(xmlFileContent));

    mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([validNegatedTestRusult]);
    when(mockedTestResultsFileGenerator.createFile)
      .calledWith([validNegatedTestRusult], basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileContentNegated);
    when(mockedTestResultsFileGenerator.createFileName)
      .calledWith(basicMetadata, TarsResultType.NEGATED_RESULT)
      .mockReturnValue(xmlFileNameNegated);
    when(mockedMetadataService.generateMD5Checksum)
      .calledWith(xmlFileContentNegated)
      .mockReturnValue(xmlFileChcksumNegated);
    when(mockedAzureFilesClient.downloadFile)
      .calledWith(tarsShareName, xmlFileNameNegated)
      .mockRejectedValue(resultsDownloadError);

    try {
      await resultsDispatcher.dispatchResults();
      fail();
    } catch (error) {
      expect(error).toBeInstanceOf(AzureFilesError);
      expect(error.message).toEqual('Failed to upload results file');
      expect(error.cause).toEqual(resultsDownloadError);
      expect(error.properties).toEqual({
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
    expect(mockedMetadataService.generateMD5Checksum).toHaveBeenCalledTimes(3);
    expect(mockedMetadataClient.uploadMetadataFile).toHaveBeenNthCalledWith(
      1,
      {
        fileName: xmlFileName,
        checksum: xmlFileChcksum,
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
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_UPLOAD_SUCCESSFUL,
      'Successfully uploaded results file',
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
      const validResultsArray = new Array(numberofValid).fill(validTestRusult);
      const malformedResultsArray = new Array(numberOfMalformed).fill(malformedTestRusult);
      mockedCrmClient.getUnprocessedTestResults.mockResolvedValue(validResultsArray.concat(malformedResultsArray));
      mockedMetadataService.prepareNewBasicMetadata.mockResolvedValue(basicMetadata);
      when(mockedTestResultsFileGenerator.createFile)
        .calledWith([validTestRusult], basicMetadata, TarsResultType.RESULT)
        .mockReturnValue(xmlFileContent);
      when(mockedTestResultsFileGenerator.createFileName)
        .calledWith(basicMetadata, TarsResultType.RESULT)
        .mockReturnValue(xmlFileName);
      mockedMetadataService.generateMD5Checksum.mockReturnValue(xmlFileChcksum);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(tarsShareName, xmlFileName)
        .mockResolvedValue(Buffer.from(xmlFileContent));

      mockedCrmClient.getUnprocessedNegatedTestResults.mockResolvedValue([]);

      await resultsDispatcher.dispatchResults();

      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(numberOfBatches);
    });
});

const validTestRusult = new TestResult({
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
  'person.gendercode': GenderCode.FEMALE,
  'person.ftts_title': Title.Miss,
  'person.firstname': 'Ellie',
  'person.lastname': 'Walker',
  'person.birthdate': '1989-03-12',
  'person.licence.ftts_licence': '20406011',
  'product.ftts_examseriescode': 'LGV',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});

const validNegatedTestRusult = new TestResult({
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
  'person.gendercode': GenderCode.MALE,
  'person.ftts_title': Title.Mr,
  'person.firstname': 'Nile',
  'person.lastname': 'Johnson',
  'person.birthdate': '1989-03-12',
  'person.licence.ftts_licence': '20406011',
  'product.ftts_examseriescode': 'LGV',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});

const malformedTestRusult = new TestResult({
  ftts_testhistoryid: '1',
  ftts_certificatenumber: '999999999',
  ftts_teststatus: TestStatus.FAIL,
  ftts_textlanguage: TextLanguage.ENGLISH,
  ftts_starttime: new Date('2020-06-26'),
  'person.ftts_title': Title.Miss,
  'person.firstname': 'Ellie',
  'person.lastname': 'Walker',
  'person.birthdate': '1989-03-12',
  'product.ftts_examseriescode': 'LGV',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});

const malformedNegatedTestRusult = new TestResult({
  ftts_testhistoryid: '4',
  ftts_teststatus: TestStatus.NEGATED,
  ftts_starttime: new Date('2020-06-26'),
  'person.address1_line1': 'adress line 1',
  'person.address1_city': 'address city',
  'person.ftts_title': Title.Mr,
  'person.lastname': 'Johnson',
  'person.birthdate': '1989-03-12',
  'product.ftts_examseriescode': 'Car',
  'bookingproduct.ftts_reference': 'C-000-016-055-04',
});
