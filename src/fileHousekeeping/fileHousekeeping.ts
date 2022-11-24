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
    oldProcessedFilesError = error as Error;
  }

  try {
    const azureBlobClient = newAzureBlobClient();
    await deleteOldMetadataFiles(azureBlobClient);
  } catch (error) {
    oldMetadataFilesError = error as Error;
  }

  if (oldMetadataFilesError || oldProcessedFilesError) {
    throw new FileHousekeepingError('fileHousekeeping: error on deleting files', oldProcessedFilesError, oldMetadataFilesError);
  }
}

async function deleteOldProcessedFiles(
  azureFilesClient: AzureFilesClient,
): Promise<void> {
  const shareName = config.tars.azureFiles.tarsShareName;
  const processedPrefix = config.tars.processedTestResultFilePrefix;
  try {
    logger.info('fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files', { shareName });
    const files = await azureFilesClient.listFiles(shareName);
    const lastProcessedFile = getLastProcessedFile(processedPrefix, files);
    const deletedFiles: string[] = [];
    if (lastProcessedFile) {
      // eslint-disable-next-line no-restricted-syntax
      for (const file of files) {
        if (file.toLowerCase().startsWith(processedPrefix) && file !== lastProcessedFile) {
          // eslint-disable-next-line no-await-in-loop
          await azureFilesClient.deleteFile(shareName, file);
          deletedFiles.push(file);
        }
      }
    }
    logger.event(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      getResultsFilesDeletedEventMessage(deletedFiles, files),
      {
        shareName,
        deletedFiles: deletedFiles.toString(),
      },
    );
  } catch (error) {
    logger.error(error as Error, 'fileHousekeeping::deleteOldProcessedFiles: An error occurred while deleting old processed files from azure file share', {
      shareName,
    });
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
    return 'fileHousekeeping::deleteOldProcessedFiles: Azure File Storage Share is empty';
  }
  return deletedFiles.length > 0
    ? 'fileHousekeeping::deleteOldProcessedFiles: The old processed files have been deleted successfully'
    : 'fileHousekeeping::deleteOldProcessedFiles: There have been no old processed files to delete';
}

async function deleteOldMetadataFiles(
  azureBlobClient: AzureBlobClient,
): Promise<void> {
  const containerName = config.common.azureBlob.metadataContainerName;
  try {
    const deletedMetadataFiles: string[] = [];
    const metadataFiles = await azureBlobClient.listFiles(containerName);
    if (metadataFiles && metadataFiles.length > 0) {
      const filteredMetadataFiles = metadataFiles.filter((file) => ![
        config.dva.metadataFilename.adi,
        config.dva.metadataFilename.ami,
        config.dva.metadataFilename.dva,
      ].includes(file));
      const lastMetadataFile = filteredMetadataFiles.reduce((prev, current) => (prev > current ? prev : current));
      // eslint-disable-next-line no-restricted-syntax
      for (const file of filteredMetadataFiles) {
        if (file !== lastMetadataFile) {
          // eslint-disable-next-line no-await-in-loop
          await azureBlobClient.deleteFile(containerName, file);
          deletedMetadataFiles.push(file);
          logger.info(`fileHousekeeping::deleteOldMetadataFiles: ${file} deleted by housekeeping cron job`, { containerName });
        }
      }
      const logMessage = (deletedMetadataFiles.length > 0
        ? `fileHousekeeping::deleteOldMetadataFiles: The old metadata files ${JSON.stringify(deletedMetadataFiles)} deleted`
        : 'fileHousekeeping::deleteOldMetadataFiles: Nothing to delete'
      ).concat(' from the Azure Blob Container');
      logger.info(logMessage, { containerName });
    } else {
      logger.info('fileHousekeeping::deleteOldMetadataFiles: Azure Blob Storage Container is empty', { containerName });
    }
  } catch (error) {
    logger.error(error as Error, 'fileHousekeeping::deleteOldMetadataFiles: An error occurred while deleting old metadata files from Azure Blob Container', {
      containerName,
    });
    throw error;
  }
}
