import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { newAzureBlobClient, AzureBlobClient } from '../azureBlob/azureBlobClient';
import { DvaMetadata } from './metadata';
import { MetadataError } from './metadataError';
import config from '../config';
import { MetadataFileNotFoundError } from './metadataFileNotFoundError';

export class DvaMetadataClient {
  constructor(
    public containerName: string,
    private azureBlobClient: AzureBlobClient,
  ) { }

  public async downloadMetadataFile(fileName: string): Promise<DvaMetadata> {
    const logProperties = {
      metadataFileName: fileName,
      containerName: this.containerName,
    };
    try {
      logger.info(`DvaMetadataClient::downloadMetadataFile: Trying to download ${fileName} metadata file`, logProperties);
      const buffer = await this.azureBlobClient.downloadFile(this.containerName, fileName);
      const metadata = JSON.parse(buffer.toString()) as DvaMetadata;
      logger.debug(`DvaMetadataClient::downloadMetadataFile: Metadata file ${fileName} contents`, {
        metadata,
        ...logProperties,
      });
      if (!this.verifyJsonMetadata(metadata)) {
        throw new Error('Invalid metadata contents');
      }
      logger.info(`DvaMetadataClient::downloadMetadataFile: Successfully downloaded ${fileName} metadata file`, logProperties);
      return metadata;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) { // may be plain Error or error thrown by Azure Blob Service
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.details?.errorCode === 'BlobNotFound') {
        throw new MetadataFileNotFoundError(`DvaMetadataClient::downloadMetadataFile: Metadata file ${fileName} not found`, undefined, {
          fileName,
        });
      }
      throw new MetadataError(`DvaMetadataClient::downloadMetadataFile: Failed to download metadata file from Azure Blob container. ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_DVA_METADATA_FETCH_ERROR,
        ...logProperties,
      });
    }
  }

  public async updateOrCreateMetadataFile(fileName: string, metadata: DvaMetadata): Promise<void> {
    const logProperties = {
      metadataFileName: fileName,
      containerName: this.containerName,
    };
    try {
      logger.info(`DvaMetadataClient::updateOrCreateMetadataFile: Trying to upload ${fileName} metadata file`, logProperties);
      logger.debug(`DvaMetadataClient::updateOrCreateMetadataFile: Metadata file ${fileName} contents`, {
        metadata,
        ...logProperties,
      });
      const t0 = Date.now();
      await this.azureBlobClient.uploadFile(this.containerName, fileName, JSON.stringify(metadata));
      logger.info(`DvaMetadataClient::updateOrCreateMetadataFile: Successfully uploaded ${fileName} metadata file`, {
        durationMs: Date.now() - t0,
        ...logProperties,
      });
    } catch (error) {
      throw new MetadataError(`DvaMetadataClient::updateOrCreateMetadataFile: Failed to upload metadata file to Azure Blob container. ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_DVA_METADATA_STORE_ERROR,
        ...logProperties,
      });
    }
  }

  private verifyJsonMetadata(json: DvaMetadata): boolean {
    return (!!json.sequenceNumber && typeof json.sequenceNumber === 'number');
  }
}

export const newDvaMetadataClient = (): DvaMetadataClient => new DvaMetadataClient(
  config.common.azureBlob.metadataContainerName,
  newAzureBlobClient(),
);
