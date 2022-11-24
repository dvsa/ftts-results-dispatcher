import { DvaMetadataClient, newDvaMetadataClient } from './dvaMetadataClient';
import { MetadataFileNotFoundError } from './metadataFileNotFoundError';
import { logger } from '../observability/logger';
import config from '../config';
import { DvaTestType } from '../dva/enums';

export class DvaMetadataService {
  constructor(
    private metadataClient: DvaMetadataClient,
  ) { }

  public async getNextSequenceNumber(metadataFilename: string, testType: DvaTestType): Promise<number> {
    try {
      const metadata = await this.metadataClient.downloadMetadataFile(metadataFilename);
      return metadata.sequenceNumber + 1;
    } catch (error) {
      if (error instanceof MetadataFileNotFoundError) {
        if (config.dva.createMetadataFileIfNotExists) {
          logger.warn(`DvaMetadataService::getNextSequenceNumber: Metadata file ${metadataFilename} does not exist, will create a new one`, {
            metadataFilename,
          });
          return this.getDefaultSequenceNumber(testType);
        }
        logger.warn(`DvaMetadataService::getNextSequenceNumber: Metadata file ${metadataFilename} does not exist and should not create new one`, {
          metadataFilename,
        });
      }
      throw error;
    }
  }

  public async updateSequenceNumber(metadataFilename: string, sequenceNumber: number): Promise<void> {
    await this.metadataClient.updateOrCreateMetadataFile(metadataFilename, { sequenceNumber });
  }

  private getDefaultSequenceNumber(testType: DvaTestType): number {
    switch (testType) {
      case DvaTestType.ADI:
        return Number(config.dva.defaultSequenceNumber.adi);
      case DvaTestType.AMI:
        return Number(config.dva.defaultSequenceNumber.ami);
      default:
        return Number(config.dva.defaultSequenceNumber.learner);
    }
  }
}

export const newDvaMetadataService = (): DvaMetadataService => new DvaMetadataService(
  newDvaMetadataClient(),
);
