import {
  newAzureFilesClient,
  AzureFilesClient,
} from '../azureFiles/azureFilesClient';
import config from '../config';
import {
  newAzureBlobClient,
  AzureBlobClient,
} from '../azureBlob/azureBlobClient';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { FileHousekeepingError } from './fileHousekeepingError';

export default async function fileHousekeeping(): Promise<void> {
  let oldProcessedFilesError;
  let oldMetadataFilesError;

  try {
    const azureFilesClient = newAzureFilesClient();
    await deleteOldProcessedFiles(azureFilesClient);
  } catch (error) {
    oldProcessedFilesError = error;
  }

  try {
    const azureBlobClient = newAzureBlobClient();
    await deleteOldMetadataFiles(azureBlobClient);
  } catch (error) {
    oldMetadataFilesError = error;
  }

  if (oldMetadataFilesError || oldProcessedFilesError) {
    throw new FileHousekeepingError('fileHousekeeping error', oldProcessedFilesError, oldMetadataFilesError);
  }
}

async function deleteOldProcessedFiles(
  azureFilesClient: AzureFilesClient,
): Promise<void> {
  const shareName = config.azureFiles.tarsShareName;
  const processedPrefix = config.tars.processedTestResultFilePrefix;
  try {
    logger.info('Trying to delete old processed files', { shareName });
    const files = await azureFilesClient.listFiles(shareName);
    const lastProcessedFile = getLastProcessedFile(processedPrefix, files);
    const deletedFiles: string[] = [];
    if (lastProcessedFile) {
      files.forEach((file) => {
        if (file.toLowerCase().startsWith(processedPrefix) && file !== lastProcessedFile) {
          azureFilesClient.deleteFile(shareName, file);
          deletedFiles.push(file);
        }
      });
    }
    logger.logEvent(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      getResultsFilesDeletedEventMessage(deletedFiles, files),
      {
        shareName,
        deletedFiles: deletedFiles.toString(),
      },
    );
  } catch (error) {
    logger.error(
      error,
      'An error occurred while deleting old processed files from azure file share',
      { shareName },
    );
    throw error;
  }
}

function getLastProcessedFile(processedPrefix: string, files?: string[]): string | undefined {
  const processedFiles = files
    ? files.filter((file: string) => file.toLowerCase().startsWith(processedPrefix))
    : [];
  if (processedFiles.length > 0) {
    return processedFiles
      .reduce((prev, current) => (
        prev.toLowerCase().replace(/-/g, '') > current.toLowerCase().replace(/-/g, '')
          ? prev : current));
  }
  return undefined;
}

function getResultsFilesDeletedEventMessage(deletedFiles: string[], files?: string[]): string {
  if (!files || files.length === 0) {
    return 'Azure File Storage Share is empty';
  }
  return deletedFiles.length > 0
    ? 'The old processed files have been deleted successfully'
    : 'There have been no old processed files to delete';
}

async function deleteOldMetadataFiles(
  azureBlobClient: AzureBlobClient,
): Promise<void> {
  const containerName = config.azureBlob.metadataContainerName;
  try {
    const deletedMetadataFiles: string[] = [];
    const metadataFiles = await azureBlobClient.listFiles(containerName);
    if (metadataFiles && metadataFiles.length > 0) {
      const lastMetadataFile = metadataFiles.reduce((prev, current) => (prev > current ? prev : current));
      metadataFiles.forEach((file) => {
        if (file !== lastMetadataFile) {
          azureBlobClient.deleteFile(containerName, file);
          deletedMetadataFiles.push(file);
          logger.info(`${file} deleted by housekeeping cron job`, { containerName });
        }
      });
      const logMessage = (deletedMetadataFiles.length > 0
        ? `The old metadata files ${JSON.stringify(deletedMetadataFiles)} deleted`
        : 'Nothing to delete'
      ).concat(' from the Azure Blob Container');
      logger.info(logMessage, { containerName });
    } else {
      logger.info('Azure Blob Storage Container is empty', { containerName });
    }
  } catch (error) {
    logger.error(
      error,
      'An error occurred while deleting old metadata files from Azure Blob Container',
      { containerName },
    );
    throw error;
  }
}
