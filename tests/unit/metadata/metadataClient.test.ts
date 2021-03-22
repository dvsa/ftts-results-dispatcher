import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { AzureBlobClient, newAzureBlobClient } from '../../../src/azureBlob/azureBlobClient';
import { MetadataClient, newMetadataClient } from '../../../src/metadata/metadataClient';
import { Metadata } from '../../../src/metadata/metadata';
import { MetadataError } from '../../../src/metadata/metadataError';
import { MetadataFileNotFoundError } from '../../../src/metadata/metadataFileNotFoundError';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/observability/logger');

jest.mock('@azure/storage-blob');
jest.mock('../../../src/azureBlob/azureBlobClient');
const mockedAzureBlobClient = mock<AzureBlobClient>();
const mockedNewAzureBlobClient = mocked(newAzureBlobClient);

let metadataClient: MetadataClient;

JSON.parse = jest.fn().mockImplementationOnce(() => FILE_CONTENT);

const CONTAINER_NAME = 'test';
const FILE_NAME_1 = '1-TARS.json';
const FILE_NAME_2 = '2-TARS.json';
const FILE_CONTENT: Metadata = {
  sequenceNumber: 1,
  dailySequenceNumber: '001',
  fileName: 'test.xml',
  created: new Date(),
  checksum: 'test',
  numberOfRows: 20,
};
const ERROR = new Error('error msg');

describe('MetadataClient', () => {
  beforeEach(() => {
    mockedConfig.azureBlob.metadataContainerName = CONTAINER_NAME;
    when(mockedNewAzureBlobClient).calledWith().mockReturnValue(mockedAzureBlobClient);
    metadataClient = newMetadataClient();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('uploadMetadataFile', () => {
    test('GIVEN metadataFileContent WHEN uploadMetadataFile THEN blobClient upload method is called', async () => {
      await metadataClient.uploadMetadataFile(FILE_CONTENT);

      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        CONTAINER_NAME,
        FILE_NAME_1,
        JSON.stringify(FILE_CONTENT),
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        `Trying to upload ${FILE_NAME_1} metadata file`,
        { metadataFileName: FILE_NAME_1, containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        `Successfully uploaded ${FILE_NAME_1} metadata file`,
        { metadataFileName: FILE_NAME_1, containerName: CONTAINER_NAME },
      );
    });

    test('GIVEN metadataFileContent WHEN uploadMetadataFile and azureBlobClient uploadFile failed THEN proper AzureBlobError is thrown', async () => {
      when(mockedAzureBlobClient.uploadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME_1, JSON.stringify(FILE_CONTENT))
        .mockRejectedValue(ERROR);

      try {
        await metadataClient.uploadMetadataFile(FILE_CONTENT);
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect(error.message).toEqual(`Failed to upload a new metadata file to Azure Blob container. ${ERROR.message}`);
        expect(error.cause).toEqual(ERROR);
        expect(error.properties).toEqual({
          event: BusinessTelemetryEvent.RES_TARS_METADATA_STORE_ERROR,
          metadataFileName: FILE_NAME_1,
          containerName: CONTAINER_NAME,
        });
      }
    });
  });

  describe('downloadLatestMetadataFile', () => {
    test('GIVEN nothing WHEN downloadLatestMetadataFile THEN proper Metadata object is return', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue(['1-TARS.json', '2-TARS.json']);
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME_2)
        .mockResolvedValue(Buffer.alloc(0));

      const actualMetadata = await metadataClient.downloadLatestMetadataFile();

      expect(actualMetadata).toEqual(FILE_CONTENT);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to list all existing metadata files',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        `Trying to download ${FILE_NAME_2} metadata file`,
        { metadataFileName: FILE_NAME_2, containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        3,
        `Successfully downloaded ${FILE_NAME_2} metadata file`,
        { metadataFileName: FILE_NAME_2, containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Found metadata file names: 1-TARS.json, 2-TARS.json',
      );
    });

    test('GIVEN nothing WHEN downloadLatestMetadataFile and azureBlobClient listFiles failed THEN proper AzureBlobError is thrown', async () => {
      when(mockedAzureBlobClient.listFiles)
        .calledWith(CONTAINER_NAME)
        .mockRejectedValue(ERROR);

      try {
        await metadataClient.downloadLatestMetadataFile();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect(error.message).toEqual('Failed to list all existing metadata files from Azure Blob container');
        expect(error.cause).toEqual(ERROR);
        expect(error.properties).toEqual({
          event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
          containerName: CONTAINER_NAME,
        });
      }
    });

    test('GIVEN nothing WHEN downloadLatestMetadataFile and azureBlobClient listFiles returns empty array THEN proper MetadataError is thrown', async () => {
      when(mockedAzureBlobClient.listFiles)
        .calledWith(CONTAINER_NAME)
        .mockResolvedValue([]);

      await expect(metadataClient.downloadLatestMetadataFile())
        .rejects.toEqual(new MetadataFileNotFoundError());
      expect(mockedLogger.logEvent).toHaveBeenCalledWith(BusinessTelemetryEvent.RES_TARS_NO_METADATA_ERROR);
    });

    test('GIVEN nothing WHEN downloadLatestMetadataFile and azureBlobClient downloadFile failed THEN proper AzureBlobError is thrown', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue(['1-TARS.json', '2-TARS.json']);
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME_2)
        .mockRejectedValue(ERROR);

      try {
        await metadataClient.downloadLatestMetadataFile();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect(error.message).toEqual(`Failed to download a metadata file from Azure Blob container. ${ERROR.message}`);
        expect(error.cause).toEqual(ERROR);
        expect(error.properties).toEqual({
          event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
          metadataFileName: FILE_NAME_2,
          containerName: CONTAINER_NAME,
        });
      }
    });
  });
});
