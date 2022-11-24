import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import * as JEST_DATE_MOCK from 'jest-date-mock';
import { mockedConfig } from '../../mocks/config.mock';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { newTarsMetadataService, TarsMetadataService } from '../../../src/metadata/tarsMetadataService';
import { newTarsMetadataClient, TarsMetadataClient } from '../../../src/metadata/tarsMetadataClient';
import { newAzureFilesClient, AzureFilesClient } from '../../../src/azureFiles/azureFilesClient';
import { MetadataFileNotFoundError } from '../../../src/metadata/metadataFileNotFoundError';
import { MetadataError } from '../../../src/metadata/metadataError';
import { AzureFilesError } from '../../../src/azureFiles/azureFilesError';
import { TarsMetadata } from '../../../src/metadata/metadata';

jest.mock('../../../src/metadata/tarsMetadataClient');
const mockedNewMetadataClient = mocked(newTarsMetadataClient);
const mockedMetadataClient = mock<TarsMetadataClient>();

jest.mock('../../../src/azureFiles/azureFilesClient');
const mockedNewAzureFilesClient = mocked(newAzureFilesClient);
const mockedAzureFilesClient = mock<AzureFilesClient>();

const SHARE_NAME = 'tars';
const CREATED = new Date('2020-08-01');
const PROCESSED_FILE_PREFIX = 'processed-';

let tarsMetadataService: TarsMetadataService;

describe('TarsMetadataService', () => {
  beforeEach(() => {
    JEST_DATE_MOCK.advanceTo(CREATED);
    mockedConfig.tars.azureFiles.tarsShareName = SHARE_NAME;
    mockedConfig.tars.processedTestResultFilePrefix = PROCESSED_FILE_PREFIX;
    when(mockedNewMetadataClient).calledWith().mockReturnValue(mockedMetadataClient);
    mockedMetadataClient.containerName = 'results';
    when(mockedNewAzureFilesClient).calledWith().mockReturnValue(mockedAzureFilesClient);

    tarsMetadataService = newTarsMetadataService();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('prepareNewBasicMetadata', () => {
    test('GIVEN nothing WHEN test result file exists, has valid metadata file and new processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: TarsMetadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(true);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(Buffer.from('test'));

      const actualBasicMetadata = await tarsMetadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000001,
        dailySequenceNumber: '001',
        created: CREATED,
      });
    });

    test('GIVEN nothing WHEN test result file exists, has metadata file with different MD5 cheksum and new processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: TarsMetadata = prepareMetadataFile(new Date('2020-01-01'), 'wrong');
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(true);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(Buffer.from('test'));

      const actualBasicMetadata = await tarsMetadataService.prepareNewBasicMetadata();

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
      const expectedMetadata: TarsMetadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
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

      const actualBasicMetadata = await tarsMetadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000001,
        dailySequenceNumber: '001',
        created: CREATED,
      });
    });

    test('GIVEN nothing WHEN no test result file, no proccessed file, metadata file exists and new processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: TarsMetadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
      const expectedProcessedTestResultFileName = `${PROCESSED_FILE_PREFIX}${expectedMetadata.fileName}`;
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(false);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedProcessedTestResultFileName)
        .mockResolvedValue(false);

      const actualBasicMetadata = await tarsMetadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000000,
        dailySequenceNumber: '001',
        created: CREATED,
      });
      expect(mockedAzureFilesClient.downloadFile).toHaveBeenCalledTimes(0);
    });

    test('GIVEN nothing WHEN no test result file, no proccessed file, metadata file exists and same processed date THEN proper new BasicMetadata is returns', async () => {
      const expectedMetadata: TarsMetadata = prepareMetadataFile(CREATED, '098f6bcd4621d373cade4e832627b4f6');
      const expectedProcessedTestResultFileName = `${PROCESSED_FILE_PREFIX}${expectedMetadata.fileName}`;
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(false);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedProcessedTestResultFileName)
        .mockResolvedValue(false);

      const actualBasicMetadata = await tarsMetadataService.prepareNewBasicMetadata();

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

      const actualBasicMetadata = await tarsMetadataService.prepareNewBasicMetadata();

      expect(actualBasicMetadata).toEqual({
        sequenceNumber: 1000000,
        dailySequenceNumber: '001',
        created: CREATED,
      });
    });

    test('GIVEN nothing WHEN an error occurred during download metadata file THEN proper MetadataError is thrown', async () => {
      const errorMessage = 'download failed';
      const downloadError = new MetadataError(errorMessage);
      mockedMetadataClient.downloadLatestMetadataFile.mockRejectedValueOnce(downloadError);

      try {
        await tarsMetadataService.prepareNewBasicMetadata();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect((error as MetadataError).message).toEqual(errorMessage);
      }
    });

    test('GIVEN nothing WHEN an error occurred during download test result file THEN proper TestResultError is thrown', async () => {
      const downloadTestResultFileError = new AzureFilesError('download failed');
      const expectedMetadata: TarsMetadata = prepareMetadataFile(new Date('2020-01-01'), '098f6bcd4621d373cade4e832627b4f6');
      mockedMetadataClient.downloadLatestMetadataFile.mockResolvedValue(expectedMetadata);
      when(mockedAzureFilesClient.fileExists)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockResolvedValue(true);
      when(mockedAzureFilesClient.downloadFile)
        .calledWith(SHARE_NAME, expectedMetadata.fileName)
        .mockRejectedValue(downloadTestResultFileError);

      try {
        await tarsMetadataService.prepareNewBasicMetadata();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect((error as MetadataError).message).toEqual('TarsMetadataService::prepareNewBasicMetadata: Failed to calculate new sequence number and daily sequence number for result file. TarsMetadataService::processIfResultFileExists: Failed to download a result file from the Azure Files share');
        expect((error as MetadataError).cause).toBeInstanceOf(AzureFilesError);
        expect(((error as MetadataError).cause as AzureFilesError).message).toEqual(
          'TarsMetadataService::processIfResultFileExists: Failed to download a result file from the Azure Files share',
        );
        expect(((error as MetadataError).cause as AzureFilesError).properties).toEqual(
          {
            event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_FETCH_ERROR,
            fileName: expectedMetadata.fileName,
            shareName: SHARE_NAME,
          },
        );
      }
    });
  });
});

function prepareMetadataFile(created: Date, checksum: string): TarsMetadata {
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
  const expectedMetadata: TarsMetadata = {
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

  const actualBasicMetadata = await tarsMetadataService.prepareNewBasicMetadata();

  expect(actualBasicMetadata).toEqual({
    sequenceNumber: 1000001,
    dailySequenceNumber: expectedDailySequenceNumber,
    created: CREATED,
  });
}
