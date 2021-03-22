import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { newAzureBlobClient, AzureBlobClient } from '../azureBlob/azureBlobClient';
import { Metadata } from './metadata';
import { MetadataError } from './metadataError';
import { MetadataFileNotFoundError } from './metadataFileNotFoundError';
import config from '../config';

const METADATA_FILE_NAME_SUFIX_WITH_EXTENSION = '-TARS.json';

export class MetadataClient {
  constructor(
    public containerName: string,
    private azureBlobClient: AzureBlobClient,
  ) { }

  public async uploadMetadataFile(metadata: Metadata): Promise<void> {
    const metadataFileName = `${metadata.sequenceNumber}${METADATA_FILE_NAME_SUFIX_WITH_EXTENSION}`;
    const properties = {
      metadataFileName,
      containerName: this.containerName,
    };
    try {
      logger.info(`Trying to upload ${metadataFileName} metadata file`, properties);
      await this.azureBlobClient.uploadFile(this.containerName, metadataFileName, JSON.stringify(metadata));
      logger.info(`Successfully uploaded ${metadataFileName} metadata file`, properties);
    } catch (error) {
      throw new MetadataError(
        `Failed to upload a new metadata file to Azure Blob container. ${error.message}`,
        error,
        {
          event: BusinessTelemetryEvent.RES_TARS_METADATA_STORE_ERROR,
          ...properties,
        },
      );
    }
  }

  public async downloadLatestMetadataFile(): Promise<Metadata> {
    const metadataFileName: string = await this.getLatestMetadataFileName();
    const properties = {
      metadataFileName,
      containerName: this.containerName,
    };
    try {
      logger.info(`Trying to download ${metadataFileName} metadata file`, properties);
      const buffer: Buffer = await this.azureBlobClient.downloadFile(this.containerName, metadataFileName);
      const metadata: Metadata = JSON.parse(buffer.toString()) as Metadata;
      this.verifyJsonMetdata(metadata);
      logger.info(`Successfully downloaded ${metadataFileName} metadata file`, properties);
      return metadata;
    } catch (error) {
      throw new MetadataError(
        `Failed to download a metadata file from Azure Blob container. ${error.message}`,
        error,
        {
          event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
          ...properties,
        },
      );
    }
  }

  private async getLatestMetadataFileName(): Promise<string> {
    logger.info('Trying to list all existing metadata files');
    let fileNames: string[] = [];
    try {
      fileNames = await this.azureBlobClient.listFiles(this.containerName);
    } catch (error) {
      throw new MetadataError(
        'Failed to list all existing metadata files from Azure Blob container',
        error,
        {
          event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
          containerName: this.containerName,
        },
      );
    }
    if (fileNames.length === 0) {
      // MetadataFileNotFoundError is handle in the MetadataService, so the event should be logged here, instead of putting it to the error properties
      logger.logEvent(BusinessTelemetryEvent.RES_TARS_NO_METADATA_ERROR);
      throw new MetadataFileNotFoundError();
    }
    return this.extractLatestMetadataFileName(fileNames);
  }

  private extractLatestMetadataFileName(fileNames: string[]): string {
    try {
      logger.debug(`Found metadata file names: ${fileNames.join(', ')}`);
      return fileNames
        .map((name) => name.split('-')[0])
        .reduce((prev, current) => ((+prev > +current) ? prev : current))
        .concat(METADATA_FILE_NAME_SUFIX_WITH_EXTENSION);
    } catch (error) {
      throw new MetadataError(
        `Failed to extract latest metadata file name from Azure Blob container. ${error.message}`,
        error,
        {
          event: BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR,
          containerName: this.containerName,
        },
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private verifyJsonMetdata(json: any): void {
    if (!json.sequenceNumber
      || !json.dailySequenceNumber
      || !json.created
      || !json.fileName
      || !json.checksum
      || !json.numberOfRows) {
      throw new Error('Wrong metadata file');
    }
  }
}

export const newMetadataClient = (): MetadataClient => new MetadataClient(
  config.azureBlob.metadataContainerName,
  newAzureBlobClient(),
);
