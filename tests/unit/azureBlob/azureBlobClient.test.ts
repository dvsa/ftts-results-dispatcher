import { mocked } from 'ts-jest/utils';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import * as AZURE_BLOB from '@azure/storage-blob';
import { PagedAsyncIterableIterator } from '@azure/core-paging';
import { newAzureBlobServiceClient } from '../../../src/azureBlob/azureBlobServiceClient';
import { AzureBlobClient, newAzureBlobClient } from '../../../src/azureBlob/azureBlobClient';
import { AzureBlobError } from '../../../src/azureBlob/azureBlobError';

const FILE_NAME = 'test.json';
const FILE_CONTENT = 'content';
const CONTAINER_NAME = 'test';

jest.mock('@azure/storage-blob');
jest.mock('../../../src/azureBlob/azureBlobServiceClient');
const mockedNewAzureBlobServiceClient = mocked(newAzureBlobServiceClient);
const mockedBlobServiceClient = mock<AZURE_BLOB.BlobServiceClient>();
const mockedContainerClient = mock<AZURE_BLOB.ContainerClient>();
const mockedBlockBlobClient = mock<AZURE_BLOB.BlockBlobClient>();

let blobClient: AzureBlobClient;

describe('AzureBlobClient', () => {
  beforeEach(() => {
    when(mockedNewAzureBlobServiceClient).calledWith().mockReturnValue(mockedBlobServiceClient);
    blobClient = newAzureBlobClient();
    when(mockedBlobServiceClient.getContainerClient)
      .calledWith(CONTAINER_NAME)
      .mockReturnValue(mockedContainerClient);
    when(mockedContainerClient.getBlockBlobClient)
      .calledWith(FILE_NAME)
      .mockReturnValue(mockedBlockBlobClient);
  });

  afterEach(() => {
    mockedBlobServiceClient.getContainerClient.mockClear();
    mockedContainerClient.getBlockBlobClient.mockClear();
    mockedContainerClient.createIfNotExists.mockClear();
  });

  describe('uploadFile', () => {
    test('GIVEN no errors WHEN called THEN the container is created if not existed', async () => {
      when(mockedBlockBlobClient.upload)
        .calledWith(
          FILE_CONTENT,
          Buffer.byteLength(FILE_CONTENT),
        ).mockResolvedValue({} as AZURE_BLOB.BlockBlobUploadResponse);

      await blobClient.uploadFile(CONTAINER_NAME, FILE_NAME, FILE_CONTENT);

      expect(mockedContainerClient.createIfNotExists).toHaveBeenCalledTimes(1);
    });

    test('GIVEN upload fails WHEN called THEN the AzureBlobError is thrown', async () => {
      const EXPECTED_ERROR_CODE = '400';
      when(mockedBlockBlobClient.upload)
        .calledWith(
          FILE_CONTENT,
          Buffer.byteLength(FILE_CONTENT),
        ).mockResolvedValue({
          errorCode: EXPECTED_ERROR_CODE,
        } as AZURE_BLOB.BlockBlobUploadResponse);

      try {
        await blobClient.uploadFile(CONTAINER_NAME, FILE_NAME, FILE_CONTENT);
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(AzureBlobError);
        expect((error as AzureBlobError).message).toEqual('Failed to upload a file with error code: 400');
        expect((error as AzureBlobError).cause).toBeUndefined();
        expect((error as AzureBlobError).properties).toEqual({ fileName: FILE_NAME, containerName: CONTAINER_NAME });
      }
    });
  });

  describe('downloadFile', () => {
    test('GIVEN no errors WHEN called THEN proper Buffer object is returned', async () => {
      const expectedBuffer = Buffer.alloc(0);
      mockedBlockBlobClient.downloadToBuffer.mockResolvedValue(expectedBuffer);

      const actualBuffer = await blobClient.downloadFile(CONTAINER_NAME, FILE_NAME);

      expect(mockedContainerClient.createIfNotExists).toHaveBeenCalledTimes(1);
      expect(mockedBlockBlobClient.downloadToBuffer).toHaveBeenCalledTimes(1);
      expect(actualBuffer).toEqual(expectedBuffer);
    });
  });

  describe('listFiles', () => {
    test('GIVEN no errors WHEN called THEN the returned list contains expected blobs', async () => {
      when(mockedContainerClient.listBlobsFlat)
        .calledWith()
        .mockReturnValue([
          {
            name: 'foo.txt',
          } as AZURE_BLOB.BlobItem,
          {
            name: 'bar.txt',
          } as AZURE_BLOB.BlobItem,
        ] as unknown as PagedAsyncIterableIterator<AZURE_BLOB.BlobItem, AZURE_BLOB.ContainerListBlobFlatSegmentResponse>);

      const files: string[] = await blobClient.listFiles(CONTAINER_NAME);

      expect(mockedContainerClient.createIfNotExists).toHaveBeenCalledTimes(1);
      expect(files).toContain('foo.txt');
      expect(files).toContain('bar.txt');
    });
  });

  describe('deleteFile', () => {
    test('GIVEN no errors WHEN called THEN the delete blob with proper file name is called', async () => {
      when(mockedContainerClient.deleteBlob)
        .calledWith(FILE_NAME)
        .mockResolvedValue({} as AZURE_BLOB.BlockBlobUploadResponse);

      await blobClient.deleteFile(CONTAINER_NAME, FILE_NAME);

      expect(mockedContainerClient.createIfNotExists).toHaveBeenCalledTimes(1);
      expect(mockedContainerClient.deleteBlob).toHaveBeenCalledTimes(1);
    });

    test('GIVEN delete fails WHEN called THEN the AzureBlobError is thrown', async () => {
      const EXPECTED_ERROR_CODE = '400';
      when(mockedContainerClient.deleteBlob)
        .calledWith(FILE_NAME)
        .mockResolvedValue({
          errorCode: EXPECTED_ERROR_CODE,
        } as AZURE_BLOB.BlockBlobUploadResponse);

      await expect(
        blobClient.deleteFile(CONTAINER_NAME, FILE_NAME),
      ).rejects.toEqual(new AzureBlobError(`Failed to delete a ${FILE_NAME} file with error code: ${EXPECTED_ERROR_CODE}`));
    });
  });
});
