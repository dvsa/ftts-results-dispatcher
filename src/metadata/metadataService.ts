import * as crypto from 'crypto-js';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { newMetadataClient, MetadataClient } from './metadataClient';
import { newAzureFilesClient, AzureFilesClient } from '../azureFiles/azureFilesClient';
import { Metadata, BasicMetadata } from './metadata';
import { AzureFilesError } from '../azureFiles/azureFilesError';
import { MetadataError } from './metadataError';
import { MetadataFileNotFoundError } from './metadataFileNotFoundError';
import config from '../config';

const DEFAULT_SEQUENCE_NUMBER = 1000000;
const DEFAULT_DAILY_SEQUENCE_NUMBER = '001';

export class MetadataService {
  constructor(
    private tarsShareName: string,
    private metadataClient: MetadataClient,
    private azureFilesClient: AzureFilesClient,
  ) { }

  public async prepareNewBasicMetadata(): Promise<BasicMetadata> {
    try {
      const metadata = await this.downloadLatestMetadataFile();
      if (!metadata.fileName) {
        return metadata as unknown as BasicMetadata;
      }
      const latestMetadataFile: Metadata = metadata as unknown as Metadata;
      const { fileName } = latestMetadataFile;
      if (!await this.azureFilesClient.fileExists(this.tarsShareName, fileName)) {
        logger.info(
          `No result file: ${fileName}, found in the Azure Storage ${this.tarsShareName} file share`,
          { fileName, shareName: this.tarsShareName },
        );
        const processedFileName = `${config.tars.processedTestResultFilePrefix}${fileName}`;
        if (!await this.azureFilesClient.fileExists(this.tarsShareName, processedFileName)) {
          logger.info(
            `No processed result file: ${processedFileName} found in the Azure Storage ${this.tarsShareName} file share`,
            { processedFileName, shareName: this.tarsShareName },
          );
          return this.processIfNoOrInvalidResultFile(latestMetadataFile);
        }
        logger.info(`Processed result file ${processedFileName} exists`, { processedFileName });
        return this.processIfResultFileExists(processedFileName, latestMetadataFile);
      }
      logger.info(`Result file ${fileName} exists`, { fileName });
      return this.processIfResultFileExists(fileName, latestMetadataFile);
    } catch (error) {
      throw new MetadataError(
        `Failed to calculate new sequence number and daily sequence number for result file. ${error.message}`,
        error,
      );
    }
  }

  public generateMD5Checksum(fileContent: string): string {
    return crypto.MD5(fileContent).toString();
  }

  private async downloadLatestMetadataFile(): Promise<Partial<Metadata>> {
    try {
      return await this.metadataClient.downloadLatestMetadataFile();
    } catch (error) {
      if (error instanceof MetadataFileNotFoundError) {
        return {
          sequenceNumber: DEFAULT_SEQUENCE_NUMBER,
          dailySequenceNumber: DEFAULT_DAILY_SEQUENCE_NUMBER,
          created: new Date(),
        };
      }
      throw error;
    }
  }

  private processIfNoOrInvalidResultFile(latestMetadataFile: Metadata): BasicMetadata {
    logger.info('Reusing previous sequence number and calculating new daily sequence number');
    return {
      sequenceNumber: latestMetadataFile.sequenceNumber,
      dailySequenceNumber: this.calculateDailySequenceNumber(latestMetadataFile, false),
      created: new Date(),
    };
  }

  private async processIfResultFileExists(
    resultFileName: string,
    latestMetadataFile: Metadata,
  ): Promise<BasicMetadata> {
    let resultFile: string;
    try {
      const buffer: Buffer = await this.azureFilesClient.downloadFile(this.tarsShareName, resultFileName);
      resultFile = buffer.toString();
    } catch (error) {
      throw new AzureFilesError(
        'Failed to download a result file from the Azure Files share',
        error,
        {
          event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_FETCH_ERROR,
          fileName: resultFileName,
          shareName: this.tarsShareName,
        },
      );
    }
    if (!this.isSameMD5Checksum(resultFile, latestMetadataFile)) {
      logger.info(`Invalid MD5 checksum for the result file ${resultFileName}`, { resultFileName });
      return this.processIfNoOrInvalidResultFile(latestMetadataFile);
    }
    logger.info(`Valid MD5 checksum for the test result file ${resultFileName}`, { resultFileName });
    logger.info('Incrementing previous sequence number and calculating new daily sequence number');
    return {
      sequenceNumber: latestMetadataFile.sequenceNumber + 1,
      dailySequenceNumber: this.calculateDailySequenceNumber(latestMetadataFile, true),
      created: new Date(),
    };
  }

  private calculateDailySequenceNumber(metadataFile: Metadata, isResultFileOk: boolean): string {
    if (this.isCurrentDate(metadataFile.created)) {
      const nextNumber: number = isResultFileOk
        ? +metadataFile.dailySequenceNumber + 1
        : +metadataFile.dailySequenceNumber;
      return this.formatDailySequenceNumber(nextNumber);
    }
    return this.formatDailySequenceNumber(1);
  }

  private isCurrentDate(date: Date): boolean {
    const previousDate = new Date(date);
    const currentDate = new Date();
    return previousDate.getFullYear() === currentDate.getFullYear()
      && previousDate.getMonth() === currentDate.getMonth()
      && previousDate.getDate() === currentDate.getDate();
  }

  private formatDailySequenceNumber(seqNumber: number): string {
    if (seqNumber < 10) return `00${seqNumber}`;
    if (seqNumber >= 10 && seqNumber < 100) return `0${seqNumber}`;
    return seqNumber.toString();
  }

  private isSameMD5Checksum(resultFileContent: string, metadataFile: Metadata): boolean {
    return this.generateMD5Checksum(resultFileContent) === metadataFile.checksum;
  }
}

export const newMetadataService = (): MetadataService => new MetadataService(
  config.azureFiles.tarsShareName,
  newMetadataClient(),
  newAzureFilesClient(),
);
