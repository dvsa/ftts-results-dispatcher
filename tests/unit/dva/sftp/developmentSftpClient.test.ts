import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import { mocked } from 'ts-jest/utils';
import { mockedConfig } from '../../../mocks/config.mock';
import { AzureBlobClient, newAzureBlobClient } from '../../../../src/azureBlob/azureBlobClient';
import { DevelopmentSftpClient, developmentSftpClient } from '../../../../src/dva/sftp/developmentSftpClient';
import { developmentFileListWithoutPath, developmentFileListWithPath } from '../../../mocks/fileList.mock';

jest.mock('../../../../src/config');
jest.mock('../../../../src/observability/logger');

jest.mock('../../../../src/azureBlob/azureBlobClient');
const mockedNewAzureBlobClient = mocked(newAzureBlobClient, true);
const mockedAzureBlobClient = mock<AzureBlobClient>();

const containerName = 'stub-sftp';
const blobFileName = 'DVA_DVSA_FTTS/driver_entitlements/mockResultsFile.txt';
const fileContent = 'foo';
const expectedError = new Error('failed');

let devSftpClient: DevelopmentSftpClient;

describe('DevelopmentSftpClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedConfig.common.azureBlob.stubSftpContainerName = containerName;
    mockedNewAzureBlobClient.mockReturnValue(mockedAzureBlobClient);
    devSftpClient = developmentSftpClient();
  });

  describe('getFile', () => {
    test('GIVEN a source path WHEN called THEN return only file content as a string', async () => {
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(containerName, blobFileName)
        .mockResolvedValue(Buffer.from(fileContent));

      const actualFileContent = await devSftpClient.getFile(blobFileName);

      expect(actualFileContent).toEqual(fileContent);
    });

    test('GIVEN a source path but downloading the file fails WHEN called THEN an error is thrown', async () => {
      when(mockedAzureBlobClient.downloadFile)
        .calledWith(containerName, blobFileName)
        .mockRejectedValue(expectedError);

      await expect(devSftpClient.getFile(blobFileName)).rejects.toThrow(expectedError);
    });
  });

  describe('putFile', () => {
    test('GIVEN a source path WHEN called THEN successfully uploads', async () => {
      await devSftpClient.putFile(blobFileName, fileContent);
      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(containerName, blobFileName, fileContent);
    });

    test('GIVEN a source path but uploading the file fails WHEN called THEN an error is thrown', async () => {
      when(mockedAzureBlobClient.uploadFile)
        .calledWith(containerName, blobFileName, fileContent)
        .mockRejectedValue(expectedError);

      await expect(devSftpClient.putFile(blobFileName, fileContent)).rejects.toThrow(expectedError);
    });
  });

  describe('listFiles', () => {
    test('GIVEN a list of files exists in the blob client WHEN listFiles THEN successfully returns a list of file names mapped from the response', async () => {
      const listedFiles = developmentFileListWithPath();
      mockedAzureBlobClient.listFiles.mockResolvedValue(listedFiles);

      const expectedList = await devSftpClient.listFiles(containerName);

      expect(expectedList).toStrictEqual(listedFiles);
    });

    test('GIVEN no files exist in the blob client yet WHEN listFiles THEN successfully returns an empty list', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue([]);

      const expectedList = await devSftpClient.listFiles(containerName);

      expect(expectedList).toStrictEqual([]);
    });

    test('GIVEN a list of files exist in the blob client and we pass in a search pattern to the list function WHEN listFiles THEN files are returned when matched with the search pattern', async () => {
      const listedFiles = developmentFileListWithPath();
      mockedAzureBlobClient.listFiles.mockResolvedValue(listedFiles.concat(['stub-sftp/mock-folder/DVTA2020200801.txt', 'stub-sftp/mock-folder/DVTA2020100101.txt', 'stub-sftp/mock-folder/DVTA2020100105.txt']));
      const mockSearchPattern = 'DVTA20200801';

      const expectedList = await devSftpClient.listFiles(containerName, mockSearchPattern);

      expect(expectedList).toStrictEqual(developmentFileListWithoutPath());
    });

    test('GIVEN an error occurs when trying to access the azure blob container WHEN listFiles THEN error thrown', async () => {
      mockedAzureBlobClient.listFiles.mockRejectedValue(expectedError);

      await expect(devSftpClient.listFiles(containerName)).rejects.toThrow(expectedError);
    });
  });

  describe('deleteFile', () => {
    test('GIVEN a dest path WHEN called THEN file is deleted', async () => {
      when(mockedAzureBlobClient.deleteFile)
        .calledWith(containerName, blobFileName)
        .mockResolvedValue();

      await devSftpClient.deleteFile(blobFileName);

      expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledWith(containerName, blobFileName);
    });

    test('GIVEN a dest path but deleting the file fails WHEN called THEN an error is thrown', async () => {
      when(mockedAzureBlobClient.deleteFile)
        .calledWith(containerName, blobFileName)
        .mockRejectedValue(expectedError);

      await expect(devSftpClient.deleteFile(blobFileName)).rejects.toThrow(expectedError);
    });
  });
});
