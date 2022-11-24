import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { newAzureBlobClient, AzureBlobClient } from '../azureBlob/azureBlobClient';
import { TarsMetadata } from './metadata';
import { MetadataError } from './metadataError';
import { MetadataFileNotFoundError } from './metadataFileNotFoundError';
import config from '../config';

const METADATA_FILE_NAME_SUFFIX = '-TARS';
const METADATA_FILE_EXTENSION = '.json';

export class TarsMetadataClient {
  constructor(
    public containerName: string,
    private azureBlobClient: AzureBlobClient,
  ) { }

  public async uploadMetadataFile(metadata: TarsMetadata): Promise<void> {
    const metadataFileName = `${metadata.sequenceNumber}${METADATA_FILE_NAME_SUFFIX}${METADATA_FILE_EXTENSION}`;
    const properties = {
      metadataFileName,
      containerName: this.containerName,
    };
    try {
      logger.info(`TarsMetadataClient::uploadMetadataFile: Trying to upload ${metadataFileName} metadata file`, properties);
      await this.azureBlobClient.uploadFile(this.containerName, metadataFileName, JSON.stringify(metadata));
      logger.info(`Successfully uploaded ${metadataFileName} metadata file`, properties);
    } catch (error) {
      throw new MetadataError(`TarsMetadataClient::uploadMetadataFile: Failed to upload a new metadata file to Azure Blob container. ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_TARS_METADATA_STORE_ERROR,
        ...properties,
      });
    }
  }

  public async downloadLatestMetadataFile(): Promise<TarsMetadata> {
    const metadataFileName: string = await this.getLatestMetadataFileName();
    const properties = {
      metadataFileName,
      containerName: this.containerName,
    };
    try {
      logger.info(`TarsMetadataClient::downloadLatestMetadataFile: Trying to download ${metadataFileName} metadata file`, properties);
      const buffer: Buffer = await this.azureBlobClient.downloadFile(this.containerName, metadataFileName);
      const metadata: TarsMetadata = JSON.parse(buffer.toString()) as TarsMetadata;
      this.verifyJsonMetdata(metadata as unknown as Record<string, unknown>);
      logger.info(`TarsMetadataClient::downloadLatestMetadataFile: Successfully downloaded ${metadataFileName} metadata file`, properties);
      return metadata;
    } catch (error) {
      throw new MetadataError(`TarsMetadataClient::downloadLatestMetadataFile: Failed to download a metadata file from Azure Blob container. ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
        ...properties,
      });
    }
  }

  private async getLatestMetadataFileName(): Promise<string> {
    logger.info('TarsMetadataClient::getLatestMetadataFileName: Trying to list all existing metadata files');
    let fileNames: string[] = [];
    try {
      fileNames = await this.azureBlobClient.listFiles(this.containerName);
    } catch (error) {
      throw new MetadataError('TarsMetadataClient::getLatestMetadataFileName: Failed to list all existing metadata files from Azure Blob container', error, {
        event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
        containerName: this.containerName,
      });
    }
    // We store DVA metadata files in the same container and only want TARS ones here
    const tarsFileNames = fileNames.filter((name) => name.includes(METADATA_FILE_NAME_SUFFIX));
    if (tarsFileNames.length === 0) {
      // MetadataFileNotFoundError is handle in the MetadataService, so the event should be logged here, instead of putting it to the error properties
      logger.event(BusinessTelemetryEvent.RES_TARS_NO_METADATA_ERROR);
      throw new MetadataFileNotFoundError();
    }
    return this.extractLatestMetadataFileName(fileNames);
  }

  private extractLatestMetadataFileName(fileNames: string[]): string {
    try {
      logger.debug('TarsMetadataClient::extractLatestMetadataFileName: Found metadata file names', {
        fileNames,
      });
      return fileNames
        .filter((name) => name.includes(METADATA_FILE_NAME_SUFFIX))
        .map((name) => name.split('-')[0])
        .reduce((prev, current) => ((+prev > +current) ? prev : current)) // latest sequence number
        .concat(`${METADATA_FILE_NAME_SUFFIX}${METADATA_FILE_EXTENSION}`);
    } catch (error) {
      throw new MetadataError(`TarsMetadataClient::extractLatestMetadataFileName: Failed to extract latest metadata file name from Azure Blob container. ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
        containerName: this.containerName,
      });
    }
  }

  private verifyJsonMetdata(json: Record<string, unknown>): void {
    if (!json.sequenceNumber
      || !json.dailySequenceNumber
      || !json.created
      || !json.fileName
      || !json.checksum
      || Number.isNaN(Number(json.numberOfRows))) {
      throw new Error('TarsMetadataClient::verifyJsonMetdata: Wrong metadata file');
    }
  }
}

export const newTarsMetadataClient = (): TarsMetadataClient => new TarsMetadataClient(
  config.common.azureBlob.metadataContainerName,
  newAzureBlobClient(),
);
