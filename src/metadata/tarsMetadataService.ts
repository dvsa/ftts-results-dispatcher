import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { newTarsMetadataClient, TarsMetadataClient } from './tarsMetadataClient';
import { newAzureFilesClient, AzureFilesClient } from '../azureFiles/azureFilesClient';
import { TarsMetadata, BasicTarsMetadata } from './metadata';
import { AzureFilesError } from '../azureFiles/azureFilesError';
import { MetadataError } from './metadataError';
import { MetadataFileNotFoundError } from './metadataFileNotFoundError';
import config from '../config';
import { generateMD5Checksum } from '../utils/generateMd5Checksum';

const DEFAULT_SEQUENCE_NUMBER = 1000000;
const DEFAULT_DAILY_SEQUENCE_NUMBER = '001';

export class TarsMetadataService {
  constructor(
    private tarsShareName: string,
    private metadataClient: TarsMetadataClient,
    private azureFilesClient: AzureFilesClient,
  ) { }

  public async prepareNewBasicMetadata(): Promise<BasicTarsMetadata> {
    try {
      const metadata = await this.downloadLatestMetadataFile();
      if (!metadata.fileName) {
        return metadata as unknown as BasicTarsMetadata;
      }
      const latestMetadataFile: TarsMetadata = metadata as unknown as TarsMetadata;
      const { fileName } = latestMetadataFile;
      if (!await this.azureFilesClient.fileExists(this.tarsShareName, fileName)) {
        logger.info(`TarsMetadataService::prepareNewBasicMetadata: No result file: ${fileName}, found in the Azure Storage ${this.tarsShareName} file share`, {
          fileName,
          shareName: this.tarsShareName,
        });
        const processedFileName = `${config.tars.processedTestResultFilePrefix}${fileName}`;
        if (!await this.azureFilesClient.fileExists(this.tarsShareName, processedFileName)) {
          logger.info(`TarsMetadataService::prepareNewBasicMetadata: No processed result file: ${processedFileName} found in the Azure Storage ${this.tarsShareName} file share`, {
            processedFileName,
            shareName: this.tarsShareName,
          });
          return this.processIfNoOrInvalidResultFile(latestMetadataFile);
        }
        logger.info(`TarsMetadataService::prepareNewBasicMetadata: Processed result file ${processedFileName} exists`, {
          processedFileName,
        });
        return await this.processIfResultFileExists(processedFileName, latestMetadataFile);
      }
      logger.info(`TarsMetadataService::prepareNewBasicMetadata: Result file ${fileName} exists`, {
        fileName,
      });
      return await this.processIfResultFileExists(fileName, latestMetadataFile);
    } catch (error) {
      if (error instanceof MetadataError) {
        throw error;
      }
      throw new MetadataError(`TarsMetadataService::prepareNewBasicMetadata: Failed to calculate new sequence number and daily sequence number for result file. ${(error as Error).message}`, error);
    }
  }

  private async downloadLatestMetadataFile(): Promise<Partial<TarsMetadata>> {
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

  private processIfNoOrInvalidResultFile(latestMetadataFile: TarsMetadata): BasicTarsMetadata {
    logger.info('TarsMetadataService::processIfNoOrInvalidResultFile: Reusing previous sequence number and calculating new daily sequence number');
    return {
      sequenceNumber: latestMetadataFile.sequenceNumber,
      dailySequenceNumber: this.calculateDailySequenceNumber(latestMetadataFile, false),
      created: new Date(),
    };
  }

  private async processIfResultFileExists(
    resultFileName: string,
    latestMetadataFile: TarsMetadata,
  ): Promise<BasicTarsMetadata> {
    let resultFile: string;
    try {
      const buffer: Buffer = await this.azureFilesClient.downloadFile(this.tarsShareName, resultFileName);
      resultFile = buffer.toString();
    } catch (error) {
      throw new AzureFilesError('TarsMetadataService::processIfResultFileExists: Failed to download a result file from the Azure Files share', error, {
        event: BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_FETCH_ERROR,
        fileName: resultFileName,
        shareName: this.tarsShareName,
      });
    }
    if (!this.isSameMD5Checksum(resultFile, latestMetadataFile)) {
      logger.info(`TarsMetadataService::processIfResultFileExists: Invalid MD5 checksum for the result file ${resultFileName}`, {
        resultFileName,
      });
      return this.processIfNoOrInvalidResultFile(latestMetadataFile);
    }
    logger.info(`TarsMetadataService::processIfResultFileExists: Valid MD5 checksum for the test result file ${resultFileName}`, {
      resultFileName,
    });
    logger.info('TarsMetadataService::processIfResultFileExists: Incrementing previous sequence number and calculating new daily sequence number');
    return {
      sequenceNumber: latestMetadataFile.sequenceNumber + 1,
      dailySequenceNumber: this.calculateDailySequenceNumber(latestMetadataFile, true),
      created: new Date(),
    };
  }

  private calculateDailySequenceNumber(metadataFile: TarsMetadata, isResultFileOk: boolean): string {
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

  private isSameMD5Checksum(resultFileContent: string, metadataFile: TarsMetadata): boolean {
    return generateMD5Checksum(resultFileContent) === metadataFile.checksum;
  }
}

export const newTarsMetadataService = (): TarsMetadataService => new TarsMetadataService(
  config.tars.azureFiles.tarsShareName,
  newTarsMetadataClient(),
  newAzureFilesClient(),
);
