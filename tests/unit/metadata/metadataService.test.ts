import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import * as JEST_DATE_MOCK from 'jest-date-mock';
import { mockedConfig } from '../../mocks/config.mock';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { newMetadataService, MetadataService } from '../../../src/metadata/metadataService';
import { newMetadataClient, MetadataClient } from '../../../src/metadata/metadataClient';
import { newAzureFilesClient, AzureFilesClient } from '../../../src/azureFiles/azureFilesClient';
import { MetadataFileNotFoundError } from '../../../src/metadata/metadataFileNotFoundError';
import { MetadataError } from '../../../src/metadata/metadataError';
import { AzureFilesError } from '../../../src/azureFiles/azureFilesError';
import { Metadata } from '../../../src/metadata/metadata';

jest.mock('../../../src/metadata/metadataClient');
const mockedNewMetadataClient = mocked(newMetadataClient);
const mockedMetadataClient = mock<MetadataClient>();

jest.mock('../../../src/azureFiles/azureFilesClient');
const mockedNewAzureFilesClient = mocked(newAzureFilesClient);
const mockedAzureFilesClient = mock<AzureFilesClient>();

const SHARE_NAME = 'tars';
const CREATED = new Date('2020-08-01');
const PROCESSED_FILE_PREFIX = 'processed-';

let metadataService: MetadataService;

describe('MetadataService', () => {
  beforeEach(() => {
    JEST_DATE_MOCK.advanceTo(CREATED);
    mockedConfig.azureFiles.tarsShareName = SHARE_NAME;
    mockedConfig.tars.processedTestResultFilePrefix = PROCESSED_FILE_PREFIX;
    when(mockedNewMetadataClient).calledWith().mockReturnValue(mockedMetadataClient);
    mockedMetadataClient.containerName = 'results';
    when(mockedNewAzureFilesClient).calledWith().mockReturnValue(mockedAzureFilesClient);

    metadataService = newMetadataService();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('prepareNewBasicMetadata', () => {
    test('GIVEN nothing WHEN test result file exists, has valid metadata file and new processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: Metadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(true);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(Buffer.from('test'));

      const actualBasicMetadata = await metadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000001,
        dailySequenceNumber: '001',
        created: CREATED,
      });
    });

    test('GIVEN nothing WHEN test result file exists, has metadata file with different MD5 cheksum and new processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: Metadata = prepareMetadataFile(new Date('2020-01-01'), 'wrong');
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(true);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(Buffer.from('test'));

      const actualBasicMetadata = await metadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000000,
        dailySequenceNumber: '001',
        created: CREATED,
      });
    });

    test('GIVEN nothing WHEN test result file exists, has valid metadata file and the same processed date THEN proper new BasicMetadata is returns', async () => {
      await verifyWhenSameProcessDate('001', '002');
      await verifyWhenSameProcessDate('010', '011');
      await verifyWhenSameProcessDate('100', '101');
    });

    test('GIVEN nothing WHEN no test result file, proccessed file exists, has valid metadata file and new processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: Metadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
      const expectedProcessedTestResultFileName = `${PROCESSED_FILE_PREFIX}${expectedMetadata.fileName}`;
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(false);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedProcessedTestResultFileName)
        .mockResolvedValue(true);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(SHARE_NAME, expectedProcessedTestResultFileName)
        .mockResolvedValue(Buffer.from('test'));

      const actualBasicMetadata = await metadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000001,
        dailySequenceNumber: '001',
        created: CREATED,
      });
    });

    test('GIVEN nothing WHEN no test result file, no proccessed file, metadata file exists and new processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: Metadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
      const expectedProcessedTestResultFileName = `${PROCESSED_FILE_PREFIX}${expectedMetadata.fileName}`;
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(false);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedProcessedTestResultFileName)
        .mockResolvedValue(false);

      const actualBasicMetadata = await metadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000000,
        dailySequenceNumber: '001',
        created: CREATED,
      });
      expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(0);
    });

    test('GIVEN nothing WHEN no test result file, no proccessed file, metadata file exists and same processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: Metadata = prepareMetadataFile(CREATED, '098f6bcd4621d373cade4e832627b4f6');
      const expectedProcessedTestResultFileName = `${PROCESSED_FILE_PREFIX}${expectedMetadata.fileName}`;
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(false);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedProcessedTestResultFileName)
        .mockResolvedValue(false);

      const actualBasicMetadata = await metadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000000,
        dailySequenceNumber: '001',
        created: CREATED,
      });
      expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(0);
    });

    test('GIVEN nothing WHEN metadata file is missing in Azure Blob THEN BasicMetadata with default values is returns', async () => {
      const metadataFileError = new MetadataFileNotFoundError('No metadata file');
      mockedMetadataClient.downloadLatestMetadataFile.mockRejectedValue(metadataFileError);

      const actualBasicMetadata = await metadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000000,
        dailySequenceNumber: '001',
        created: CREATED,
      });
    });

    test('GIVEN nothing WHEN an error occurred during download metadata file THEN proper MetadataError is thrown', async () => {
      const downloadError = new MetadataError('download filed');
      mockedMetadataClient.downloadLatestMetadataFile.mockRejectedValue(downloadError);

      try {
        await metadataService.prepareNewBasicMetadata();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect(error.message).toEqual('Failed to calculate new sequence number and daily sequence number for result file. download filed');
        expect(error.cause).toEqual(downloadError);
      }
    });

    test('GIVEN nothing WHEN an error occurred during download test result file THEN proper TestResultError is thrown', async () => {
      const downloadTestResultFileError = new AzureFilesError('download failed');
      const expectedMetadata: Metadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(true);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockRejectedValue(downloadTestResultFileError);

      try {
        await metadataService.prepareNewBasicMetadata();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(AzureFilesError);
        expect(error.message).toEqual('Failed to download a result file from the Azure Files share');
        expect(error.cause).toEqual(downloadTestResultFileError);
        expect(error.properties).toEqual({
          event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_FETCH_ERROR,
          fileName: expectedMetadata.fileName,
          shareName: SHARE_NAME,
        });
      }
    });
  });
  describe('generateMD5Checksum', () => {
    test('GIVEN fileContent WHEN generateMD5Checksum THEN returns proper MD5 string', () => {
      const actualMD5 = metadataService.generateMD5Checksum('test');

      expect(actualMD5).toEqual('098f6bcd4621d373cade4e832627b4f6');
    });
  });
});

function prepareMetadataFile(created: Date, checksum: string): Metadata {
  return {
    sequenceNumber: 1000000,
    dailySequenceNumber: '001',
    created,
    fileName: 'test.xml',
    checksum,
    numberOfRows: 20,
  };
}

async function verifyWhenSameProcessDate(
  metadataDailySequenceNumber: string,
  expectedDailySequenceNumber: string,
): Promise<void> {
  const expectedMetadata: Metadata = {
    sequenceNumber: 1000000,
    dailySequenceNumber: metadataDailySequenceNumber,
    created: CREATED,
    fileName: 'test.xml',
    checksum: '098f6bcd4621d373cade4e832627b4f6',
    numberOfRows: 20,
  };

  mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
  when(mockedAzureFilesClient.fileExists)
    .calledWith(SHARE_NAME, expectedMetadata.fileName)
    .mockResolvedValue(true);
  when(mockedAzureFilesClient.downloadFile)
    .calledWith(SHARE_NAME, expectedMetadata.fileName)
    .mockResolvedValue(Buffer.from('test'));

  const actualBasicMetadata = await metadataService.prepareNewBasicMetadata();

  expect(actualBasicMetadata).toEqual({
    sequenceNumber: 1000001,
    dailySequenceNumber: expectedDailySequenceNumber,
    created: CREATED,
  });
}
