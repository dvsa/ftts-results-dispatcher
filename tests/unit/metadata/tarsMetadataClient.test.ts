import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { AzureBlobClient, newAzureBlobClient } from '../../../src/azureBlob/azureBlobClient';
import { TarsMetadataClient, newTarsMetadataClient } from '../../../src/metadata/tarsMetadataClient';
import { TarsMetadata } from '../../../src/metadata/metadata';
import { MetadataError } from '../../../src/metadata/metadataError';
import { MetadataFileNotFoundError } from '../../../src/metadata/metadataFileNotFoundError';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/observability/logger');

jest.mock('@azure/storage-blob');
jest.mock('../../../src/azureBlob/azureBlobClient');
const mockedAzureBlobClient = mock<AzureBlobClient>();
const mockedNewAzureBlobClient = mocked(newAzureBlobClient);

let tarsMetadataClient: TarsMetadataClient;

JSON.parse = jest.fn().mockImplementationOnce(() => FILE_CONTENT);

const CONTAINER_NAME = 'test';
const FILE_NAME_1 = '1-TARS.json';
const FILE_NAME_2 = '2-TARS.json';
const FILE_CONTENT: TarsMetadata = {
  sequenceNumber: 1,
  dailySequenceNumber: '001',
  fileName: 'test.xml',
  created: new Date(),
  checksum: 'test',
  numberOfRows: 20,
};
const ERROR = new Error('error msg');

describe('TarsMetadataClient', () => {
  beforeEach(() => {
    mockedConfig.common.azureBlob.metadataContainerName = CONTAINER_NAME;
    when(mockedNewAzureBlobClient).calledWith().mockReturnValue(mockedAzureBlobClient);
    tarsMetadataClient = newTarsMetadataClient();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('uploadMetadataFile', () => {
    test('GIVEN metadataFileContent WHEN uploadMetadataFile THEN blobClient upload method is called', async () => {
      await tarsMetadataClient.uploadMetadataFile(FILE_CONTENT);

      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        CONTAINER_NAME,
        FILE_NAME_1,
        JSON.stringify(FILE_CONTENT),
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        `TarsMetadataClient::uploadMetadataFile: Trying to upload ${FILE_NAME_1} metadata file`,
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
        await tarsMetadataClient.uploadMetadataFile(FILE_CONTENT);
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect((error as MetadataError).message).toEqual(`TarsMetadataClient::uploadMetadataFile: Failed to upload a new metadata file to Azure Blob container. ${ERROR.message}`);
        expect((error as MetadataError).cause).toEqual(ERROR);
        expect((error as MetadataError).properties).toEqual({
          event: BusinessTelemetryEvent.RES_TARS_METADATA_STORE_ERROR,
          metadataFileName: FILE_NAME_1,
          containerName: CONTAINER_NAME,
        });
      }
    });
  });

  describe('downloadLatestMetadataFile', () => {
    test('GIVEN nothing WHEN downloadLatestMetadataFile THEN proper TarsMetadata object is return', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue(['1-TARS.json', '2-TARS.json', 'dva.json', 'dva_adi.json']);
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME_2)
        .mockResolvedValue(Buffer.alloc(0));

      const actualMetadata = await tarsMetadataClient.downloadLatestMetadataFile();

      expect(actualMetadata).toEqual(FILE_CONTENT);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'TarsMetadataClient::getLatestMetadataFileName: Trying to list all existing metadata files',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        `TarsMetadataClient::downloadLatestMetadataFile: Trying to download ${FILE_NAME_2} metadata file`,
        { metadataFileName: FILE_NAME_2, containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        3,
        `TarsMetadataClient::downloadLatestMetadataFile: Successfully downloaded ${FILE_NAME_2} metadata file`,
        { metadataFileName: FILE_NAME_2, containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'TarsMetadataClient::extractLatestMetadataFileName: Found metadata file names', {
          fileNames: ['1-TARS.json', '2-TARS.json', 'dva.json', 'dva_adi.json'],
        },
      );
    });

    test('GIVEN nothing WHEN downloadLatestMetadataFile and azureBlobClient listFiles failed THEN proper AzureBlobError is thrown', async () => {
      when(mockedAzureBlobClient.listFiles)
        .calledWith(CONTAINER_NAME)
        .mockRejectedValue(ERROR);

      try {
        await tarsMetadataClient.downloadLatestMetadataFile();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect((error as MetadataError).message).toEqual('TarsMetadataClient::getLatestMetadataFileName: Failed to list all existing metadata files from Azure Blob container');
        expect((error as MetadataError).cause).toEqual(ERROR);
        expect((error as MetadataError).properties).toEqual({
          event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
          containerName: CONTAINER_NAME,
        });
      }
    });

    test('GIVEN nothing WHEN downloadLatestMetadataFile and azureBlobClient listFiles returns empty array THEN proper MetadataError is thrown', async () => {
      when(mockedAzureBlobClient.listFiles)
        .calledWith(CONTAINER_NAME)
        .mockResolvedValue([]);

      await expect(tarsMetadataClient.downloadLatestMetadataFile())
        .rejects.toEqual(new MetadataFileNotFoundError());
      expect(mockedLogger.event).toHaveBeenCalledWith(BusinessTelemetryEvent.RES_TARS_NO_METADATA_ERROR);
    });

    test('GIVEN nothing WHEN downloadLatestMetadataFile and azureBlobClient listFiles returns only DVA files THEN proper MetadataError is thrown', async () => {
      when(mockedAzureBlobClient.listFiles)
        .calledWith(CONTAINER_NAME)
        .mockResolvedValue(['dva.json', 'dva_adi.json']);

      await expect(tarsMetadataClient.downloadLatestMetadataFile())
        .rejects.toEqual(new MetadataFileNotFoundError());
      expect(mockedLogger.event).toHaveBeenCalledWith(BusinessTelemetryEvent.RES_TARS_NO_METADATA_ERROR);
    });

    test('GIVEN nothing WHEN downloadLatestMetadataFile and azureBlobClient downloadFile failed THEN proper AzureBlobError is thrown', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue(['1-TARS.json', '2-TARS.json']);
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(CONTAINER_NAME, FILE_NAME_2)
        .mockRejectedValue(ERROR);

      try {
        await tarsMetadataClient.downloadLatestMetadataFile();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(MetadataError);
        expect((error as MetadataError).message).toEqual(`TarsMetadataClient::downloadLatestMetadataFile: Failed to download a metadata file from Azure Blob container. ${ERROR.message}`);
        expect((error as MetadataError).cause).toEqual(ERROR);
        expect((error as MetadataError).properties).toEqual({
          event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
          metadataFileName: FILE_NAME_2,
          containerName: CONTAINER_NAME,
        });
      }
    });
  });
});
