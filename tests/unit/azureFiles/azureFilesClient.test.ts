import {
  ShareServiceClient,
  ShareClient,
  ShareFileClient,
  FileCreateResponse,
  FileUploadRangeResponse,
  ShareDirectoryClient,
  FileItem,
  DirectoryItem,
  DirectoryListFilesAndDirectoriesSegmentResponse,
  FileDeleteResponse,
} from '@azure/storage-file-share';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { PagedAsyncIterableIterator, PageSettings } from '@azure/core-paging';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { AzureFilesClient, newAzureFilesClient } from '../../../src/azureFiles/azureFilesClient';
import { AzureFilesError } from '../../../src/azureFiles/azureFilesError';

jest.mock('@azure/storage-file-share');
const mockedShareServiceClient = mock<ShareServiceClient>();
const mockedShareClient = mock<ShareClient>();
const mockedShareFileClient = mock<ShareFileClient>();
const mockedShareDirectoryClient = mock<ShareDirectoryClient>();

const CONTENT = 'Hello world!!!'.repeat(500000);
const CHUNK_SIZE = 2000000;
const azureFilesClient = new AzureFilesClient(mockedShareServiceClient, CHUNK_SIZE);

const SHARE_NAME = 'tars';
const FILE_NAME = 'foo.txt';

describe('AzureFilesClient', () => {
  beforeEach(() => {
    when(mockedShareServiceClient.getShareClient)
      .calledWith(SHARE_NAME)
      .mockReturnValue(mockedShareClient);
    when(mockedShareClient.getDirectoryClient)
      .calledWith('')
      .mockReturnValue(mockedShareDirectoryClient);
    when(mockedShareDirectoryClient.getFileClient)
      .calledWith(FILE_NAME)
      .mockReturnValue(mockedShareFileClient);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('newAzureFilesClient', () => {
    test('GIVEN config.tars.azureFiles.storageConnectionString is defined WHEN called THEN azureFilesClient is created using the connection string', () => {
      mockedConfig.tars.azureFiles.storageConnectionString = 'BlobEndpoint=https://dsuksanresapistor001.blob.core.windows.net...';
      ShareServiceClient.fromConnectionString = jest.fn().mockReturnValue(mockedShareClient);

      const azureFilesClientInstance: AzureFilesClient = newAzureFilesClient();

      expect(ShareServiceClient.fromConnectionString).toBeCalledTimes(1);
      expect(ShareServiceClient.fromConnectionString).toHaveBeenCalledWith(
        mockedConfig.tars.azureFiles.storageConnectionString,
      );
      expect(ShareServiceClient).toBeCalledTimes(0);
      expect(azureFilesClientInstance.serviceClient).toBe(mockedShareClient);
    });
  });

  describe('uploadFile', () => {
    const properties = {
      shareName: SHARE_NAME,
      fileName: FILE_NAME,
    };

    test('GIVEN no errors WHEN called THEN the file is successfully uploaded', async () => {
      when(mockedShareClient.createFile)
        .calledWith(FILE_NAME, CONTENT.length)
        .mockResolvedValue({
          fileCreateResponse: {
          } as FileCreateResponse,
          fileClient: mockedShareFileClient,
        });
      mockedShareFileClient.uploadRange
        .mockResolvedValue({
        } as FileUploadRangeResponse);

      await azureFilesClient.uploadFile(
        SHARE_NAME,
        FILE_NAME,
        CONTENT,
      );

      expect(mockedShareFileClient.uploadRange).toHaveBeenCalledTimes(4);
      expect(mockedShareFileClient.uploadRange).toHaveBeenNthCalledWith(1, CONTENT.substr(0 * CHUNK_SIZE, CHUNK_SIZE), 0 * CHUNK_SIZE, CHUNK_SIZE);
      expect(mockedShareFileClient.uploadRange).toHaveBeenNthCalledWith(2, CONTENT.substr(1 * CHUNK_SIZE, CHUNK_SIZE), 1 * CHUNK_SIZE, CHUNK_SIZE);
      expect(mockedShareFileClient.uploadRange).toHaveBeenNthCalledWith(3, CONTENT.substr(2 * CHUNK_SIZE, CHUNK_SIZE), 2 * CHUNK_SIZE, CHUNK_SIZE);
      expect(mockedShareFileClient.uploadRange).toHaveBeenNthCalledWith(4, CONTENT.substr(3 * CHUNK_SIZE, CHUNK_SIZE), 3 * CHUNK_SIZE, 1000000);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'AzureFilesClient::uploadFile: Trying to create an empty file',
        properties,
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'AzureFilesClient::uploadFile: The empty file has been successfully created',
        properties,
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'AzureFilesClient::uploadFile: Trying to upload the contents of a file',
        properties,
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'AzureFilesClient::uploadFile: The contents of a file have been successfully uploaded',
        properties,
      );
    });

    test('GIVEN an error on file create WHEN called THEN re-throws the error', async () => {
      const ERR_CODE = '888';
      when(mockedShareClient.createFile)
        .calledWith(FILE_NAME, CONTENT.length)
        .mockResolvedValue({
          fileCreateResponse: {
            errorCode: ERR_CODE,
          } as FileCreateResponse,
          fileClient: mockedShareFileClient,
        });

      try {
        await azureFilesClient.uploadFile(
          SHARE_NAME,
          FILE_NAME,
          CONTENT,
        );
        fail();
      } catch (error) {
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'AzureFilesClient::uploadFile: Trying to create an empty file',
          properties,
        );
        expect(error).toBeInstanceOf(AzureFilesError);
        expect((error as AzureFilesError).message).toEqual(`AzureFilesClient::uploadFile: Failed to create an empty file: ${ERR_CODE}`);
        expect((error as AzureFilesError).cause).toBeUndefined();
        expect((error as AzureFilesError).properties).toEqual({ shareName: SHARE_NAME, fileName: FILE_NAME });
      }
    });

    test('GIVEN an error on file upload WHEN called THEN re-throws the error', async () => {
      const ERR_CODE = '999';
      const expectedError = new Error(`AzureFilesClient::uploadFileInChunks: failed to uplad: ${ERR_CODE}`);
      when(mockedShareClient.createFile)
        .calledWith(FILE_NAME, CONTENT.length)
        .mockResolvedValue({
          fileCreateResponse: {
          } as FileCreateResponse,
          fileClient: mockedShareFileClient,
        });
      mockedShareFileClient.uploadRange
        .mockResolvedValue({
          errorCode: ERR_CODE,
        } as FileUploadRangeResponse);

      try {
        await azureFilesClient.uploadFile(
          SHARE_NAME,
          FILE_NAME,
          CONTENT,
        );
        fail();
      } catch (error) {
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'AzureFilesClient::uploadFile: Trying to create an empty file',
          properties,
        );
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'AzureFilesClient::uploadFile: The empty file has been successfully created',
          properties,
        );
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'AzureFilesClient::uploadFile: Trying to upload the contents of a file',
          properties,
        );
        expect(error).toBeInstanceOf(AzureFilesError);
        expect((error as AzureFilesError).message).toEqual('AzureFilesClient::uploadFile: Failed to upload the contents of a file');
        expect((error as AzureFilesError).cause).toEqual(expectedError);
        expect((error as AzureFilesError).properties).toEqual({ shareName: SHARE_NAME, fileName: FILE_NAME });
        expect(mockedShareFileClient.deleteIfExists).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('downloadFile', () => {
    test('GIVEN fileName and shareName WHEN downloadFile THEN proper Buffer object is returned', async () => {
      const expectedBuffer = Buffer.alloc(0);
      mockedShareFileClient.downloadToBuffer.mockResolvedValue(expectedBuffer);

      const actualBuffer = await azureFilesClient.downloadFile(SHARE_NAME, FILE_NAME);

      expect(actualBuffer).toEqual(expectedBuffer);
      expect(mockedShareFileClient.downloadToBuffer).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('fileExists', () => {
    test('GIVEN fileName and shareName WHEN fileExists and file is present THEN returns true', async () => {
      mockedShareFileClient.exists.mockResolvedValue(true);

      const exists = await azureFilesClient.fileExists(SHARE_NAME, FILE_NAME);

      expect(exists).toBeTruthy();
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    });

    test('GIVEN fileName and shareName WHEN fileExists and file not present THEN returns false', async () => {
      mockedShareFileClient.exists.mockResolvedValue(false);

      const exists = await azureFilesClient.fileExists(SHARE_NAME, FILE_NAME);

      expect(exists).toBeFalsy();
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('listFiles', () => {
    const PROCESSED_FILE_NAME_1 = 'processed-TARS202008140011.xml';
    const PROCESSED_FILE_NAME_2 = 'Processed-TARS202008140021.xml';
    const UNPROCESSED_FILE_NAME = 'TARS202008150021.xml';
    const RANDOM_FILE_NAME = 'random.xml';
    const DIRECTORY = 'processed-dir';

    test('GIVEN 2 processed files, one is capitalized WHEN call listFiles THEN returns list with 2 file names', async () => {
      const listFilesAndDirectories = [
        { kind: 'file', name: PROCESSED_FILE_NAME_1 },
        { kind: 'file', name: PROCESSED_FILE_NAME_2 },
      ];
      const iterator = listFilesAndDirectories as unknown as PagedAsyncIterableIterator<({
        kind: 'file';
      } & FileItem) | ({
        kind: 'directory';
      } & DirectoryItem), DirectoryListFilesAndDirectoriesSegmentResponse, PageSettings>;
      mockedShareDirectoryClient.listFilesAndDirectories.mockReturnValue(iterator);

      const fileNames = await azureFilesClient.listFiles(SHARE_NAME);

      expect(fileNames.length).toEqual(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    });

    test('GIVEN 1 processed file and 1 unprocessed WHEN call listFiles THEN returns list with 2 file name', async () => {
      const listFilesAndDirectories = [
        { kind: 'file', name: PROCESSED_FILE_NAME_1 },
        { kind: 'file', name: UNPROCESSED_FILE_NAME },
      ];
      const iterator = listFilesAndDirectories as unknown as PagedAsyncIterableIterator<({
        kind: 'file';
      } & FileItem) | ({
        kind: 'directory';
      } & DirectoryItem), DirectoryListFilesAndDirectoriesSegmentResponse, PageSettings>;
      mockedShareDirectoryClient.listFilesAndDirectories.mockReturnValue(iterator);

      const fileNames = await azureFilesClient.listFiles(SHARE_NAME);

      expect(fileNames.length).toEqual(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    });

    test('GIVEN 1 processed file and 1 random file WHEN call listFiles THEN returns list with 1 file name', async () => {
      const listFilesAndDirectories = [
        { kind: 'file', name: PROCESSED_FILE_NAME_1 },
        { kind: 'file', name: RANDOM_FILE_NAME },
      ];
      const iterator = listFilesAndDirectories as unknown as PagedAsyncIterableIterator<({
        kind: 'file';
      } & FileItem) | ({
        kind: 'directory';
      } & DirectoryItem), DirectoryListFilesAndDirectoriesSegmentResponse, PageSettings>;
      mockedShareDirectoryClient.listFilesAndDirectories.mockReturnValue(iterator);

      const fileNames = await azureFilesClient.listFiles(SHARE_NAME);

      expect(fileNames.length).toEqual(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    });

    test('GIVEN 1 processed file and 1 directory with prefix processed WHEN call listFiles THEN returns list with 1 file name', async () => {
      const listFilesAndDirectories = [
        { kind: 'file', name: PROCESSED_FILE_NAME_1 },
        { kind: 'directory', name: DIRECTORY },
      ];
      const iterator = listFilesAndDirectories as unknown as PagedAsyncIterableIterator<({
        kind: 'file';
      } & FileItem) | ({
        kind: 'directory';
      } & DirectoryItem), DirectoryListFilesAndDirectoriesSegmentResponse, PageSettings>;
      mockedShareDirectoryClient.listFilesAndDirectories.mockReturnValue(iterator);

      const fileNames = await azureFilesClient.listFiles(SHARE_NAME);

      expect(fileNames.length).toEqual(1);
      expect(fileNames[0]).toEqual(PROCESSED_FILE_NAME_1);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteFile', () => {
    test('GIVEN fileName and shareName WHEN call deleteFile THEN deleteFile with proper file name is called', async () => {
      when(mockedShareDirectoryClient.deleteFile)
        .calledWith(FILE_NAME)
        .mockResolvedValue({
        } as FileDeleteResponse);

      await azureFilesClient.deleteFile(SHARE_NAME, FILE_NAME);

      expect(mockedShareDirectoryClient.deleteFile).toHaveBeenCalledTimes(1);
    });

    test('GIVEN an error on file delete WHEN call deleteFile THEN re-throws the error', async () => {
      const ERR_CODE = '999';
      when(mockedShareDirectoryClient.deleteFile)
        .calledWith(FILE_NAME)
        .mockResolvedValue({
          errorCode: ERR_CODE,
        } as FileUploadRangeResponse);

      await expect(azureFilesClient.deleteFile(
        SHARE_NAME,
        FILE_NAME,
      )).rejects.toEqual(new AzureFilesError(`AzureFilesClient::deleteFile: Failed to delete the file. Error code: ${ERR_CODE}`));
      expect(mockedShareDirectoryClient.deleteFile).toHaveBeenCalledTimes(1);
    });
  });
});
