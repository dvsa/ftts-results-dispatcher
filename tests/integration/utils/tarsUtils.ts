/* eslint-disable no-restricted-syntax */
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ShareClient, ShareServiceClient } from '@azure/storage-file-share';
import config from '../../../src/config';

export const createTarsShareClient = (): ShareClient => {
  const shareServiceClient = ShareServiceClient.fromConnectionString(
    config.tars.azureFiles.storageConnectionString,
  );
  return shareServiceClient.getShareClient(config.tars.azureFiles.tarsShareName);
};

export const listTarsMetadataFileNamesNewestFirst = async (): Promise<string[]> => {
  const metadataContainerClient = createMetadataContainerClient();
  const fileNames = new Array<string>();
  // eslint-disable-next-line no-restricted-syntax
  for await (const blob of metadataContainerClient.listBlobsFlat()) {
    fileNames.push(blob.name);
  }
  return fileNames
    .filter(isTarsMetadataFilename)
    .sort(tarsMetadataFilenameComparator);
};

const createMetadataContainerClient = (): ContainerClient => {
  const azureBlobServiceClient = BlobServiceClient.fromConnectionString(config.common.azureBlob.storageConnectionString);
  return azureBlobServiceClient.getContainerClient(config.common.azureBlob.metadataContainerName);
};

const isTarsMetadataFilename = (fileName: string): boolean => {
  const splittedFileName = fileName.split('-');
  return splittedFileName.length === 2 && splittedFileName[1] === 'TARS.json';
};

const tarsMetadataFilenameComparator = (file1: string, file2: string): number => {
  const seq1 = Number(file1.split('-')[0]);
  const seq2 = Number(file2.split('-')[0]);
  if (seq1 > seq2) return -1;
  if (seq1 < seq2) return 1;
  return 0;
};

export const getMetadata = async (metadataFileName: string): Promise<Record<string, unknown>> => {
  const metadataContainerClient = createMetadataContainerClient();
  const buffer = await metadataContainerClient.getBlobClient(metadataFileName).downloadToBuffer();
  return JSON.parse(buffer.toLocaleString()) as Promise<Record<string, unknown>>;
};

export const downloadTarsFileBasedOnMetadataFileName = async (metadataFileName: string, tarsShareClient: ShareClient): Promise<Buffer> => {
  const metadata = await getMetadata(metadataFileName) as { fileName: string };
  return downloadTarsFile(metadata.fileName, tarsShareClient);
};

const downloadTarsFile = async (fileName: string, tarsShareClient: ShareClient): Promise<Buffer> => tarsShareClient.getDirectoryClient('').getFileClient(fileName).downloadToBuffer();

export const removeAllFilesFromTarsShare = async (tarsShareClient: ShareClient): Promise<void> => {
  const listFilesAndDirectories = tarsShareClient.getDirectoryClient('').listFilesAndDirectories();
  for await (const item of listFilesAndDirectories) {
    if (item.kind === 'file') {
      await tarsShareClient.deleteFile(item.name);
    }
  }
};

export const thereAreSomeFilesInTarsShare = async (tarsShareClient: ShareClient): Promise<boolean> => {
  const listFilesAndDirectories = tarsShareClient.getDirectoryClient('').listFilesAndDirectories();
  for await (const item of listFilesAndDirectories) {
    if (item.kind === 'file') {
      return true;
    }
  }
  return false;
};
