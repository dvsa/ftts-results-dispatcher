import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import { mockedConfig } from '../../mocks/config.mock';
import { AzureBlobClient, newAzureBlobClient } from '../../../src/azureBlob/azureBlobClient';
import { DvaMetadataClient, newDvaMetadataClient } from '../../../src/metadata/dvaMetadataClient';
import { DvaMetadata } from '../../../src/metadata/metadata';
import { MetadataError } from '../../../src/metadata/metadataError';
import { MetadataFileNotFoundError } from '../../../src/metadata/metadataFileNotFoundError';

jest.mock('../../../src/observability/logger');

jest.mock('@azure/storage-blob');
jest.mock('../../../src/azureBlob/azureBlobClient');
const mockedAzureBlobClient = mock<AzureBlobClient>();
const mockedNewAzureBlobClient = mocked(newAzureBlobClient);

let dvaMetadataClient: DvaMetadataClient;

const CONTAINER_NAME = 'test';
const FILE_NAME = 'dva.json';
const FILE_CONTENT: DvaMetadata = {
  sequenceNumber: 1000001,
};

describe('DvaMetadataClient', () => {
  beforeEach(() => {
    JSON.parse = jest.fn().mockImplementationOnce(() => FILE_CONTENT);
    mockedConfig.common.azureBlob.metadataContainerName = CONTAINER_NAME;
    when(mockedNewAzureBlobClient).calledWith().mockReturnValue(mockedAzureBlobClient);
    dvaMetadataClient = newDvaMetadataClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadMetadataFile', () => {
    test('GIVEN valid metadata file already exists WHEN function is called THEN DvaMetadata object is returned', async () => {
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME)
        .mockResolvedValue(Buffer.alloc(0));

      const actualMetadata = await dvaMetadataClient.downloadMetadataFile(FILE_NAME);

      expect(actualMetadata).toEqual(FILE_CONTENT);
    });

    test('GIVEN metadata file contents is invalid WHEN function is called THEN MetadataError is thrown', async () => {
      JSON.parse = jest.fn().mockImplementationOnce(() => ({
        mysteriousProperty: 'ha!',
      }));
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME)
        .mockResolvedValue(Buffer.alloc(0));

      await expect(dvaMetadataClient.downloadMetadataFile(FILE_NAME)).rejects.toThrow(new MetadataError(
        'DvaMetadataClient::downloadMetadataFile: Failed to download metadata file from Azure Blob container. Invalid metadata contents',
      ));
    });

    test('GIVEN metadata file does not exist WHEN function is called THEN MetadataFileNotFoundError is thrown', async () => {
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME)
        .mockRejectedValue({
          details: {
            errorCode: 'BlobNotFound',
          },
        });

      await expect(dvaMetadataClient.downloadMetadataFile(FILE_NAME)).rejects.toThrow(MetadataFileNotFoundError);
    });

    test('GIVEN blob client fails with some unknown error WHEN function is called THEN MetadataError is thrown', async () => {
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME)
        .mockRejectedValue(new Error('Some other error'));

      await expect(dvaMetadataClient.downloadMetadataFile(FILE_NAME)).rejects.toThrow(new MetadataError(
        'DvaMetadataClient::downloadMetadataFile: Failed to download metadata file from Azure Blob container. Some other error',
      ));
    });
  });

  describe('updateOrCreateMetadataFile', () => {
    test('GIVEN filename and metadata WHEN function is called THEN blob client upload method is called', async () => {
      await dvaMetadataClient.updateOrCreateMetadataFile(FILE_NAME, FILE_CONTENT);

      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        CONTAINER_NAME,
        FILE_NAME,
        JSON.stringify(FILE_CONTENT),
      );
    });

    test('GIVEN blob client fails with some unknown error WHEN function is called THEN MetadataError is thrown', async () => {
      when(mockedAzureBlobClient.uploadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME, JSON.stringify(FILE_CONTENT))
        .mockRejectedValue(new Error('Some other error'));

      await expect(dvaMetadataClient.updateOrCreateMetadataFile(FILE_NAME, FILE_CONTENT)).rejects.toThrow(new MetadataError(
        'DvaMetadataClient::updateOrCreateMetadataFile: Failed to upload metadata file to Azure Blob container. Some other error',
      ));
    });
  });
});
