import { FixedWidthParser, ParseConfigInput } from 'fixed-width-parser';
import dayjs from 'dayjs';
import { BusinessTelemetryEvent, logger } from '../observability/logger';
import { formatDate, DateFormat } from '../utils/formatDate';
import { FileGenerationError } from '../tars/fileGenerationError';
import { DvaBaseResultRecord } from './dvaBaseResultRecord';
import { DvaTestType, dvaTestTypeToFileNameConstant } from './enums';
import { zeroFill } from '../utils/string';

export class FixedWidthTextFileGenerator {
  constructor(
    private dvaHeaderParser: FixedWidthParser,
    private dvaRecordParser: FixedWidthParser,
  ) { }

  public static createFileName(sequenceNumber: number, testType: DvaTestType, files?: string[]): string {
    const incrementNumber = FixedWidthTextFileGenerator.getIncrementNumber(files);

    const prefix = dvaTestTypeToFileNameConstant.get(testType) as string;
    const yesterday = formatDate(
      dayjs().subtract(1, 'day').toDate(),
      (testType === DvaTestType.LEARNER) ? DateFormat.yyyyMMdd : DateFormat.ddmmyyyy,
    ) as string;

    const totalSequenceNumberWidth = testType === DvaTestType.LEARNER ? 2 : 6;
    const finalSequenceNumber = testType === DvaTestType.LEARNER ? incrementNumber : sequenceNumber;

    return `${prefix}${yesterday}${zeroFill(finalSequenceNumber, totalSequenceNumberWidth)}.txt`;
  }

  public createFile(records: DvaBaseResultRecord[], headerParams: Record<string, string>): string {
    const header = this.createHeader(headerParams);
    const { sequenceNumber } = headerParams;
    logger.info(`FixedWidthTextFileGenerator::createFile: Parsing ${records.length} records to txt`, { sequenceNumber });
    let result;
    try {
      if (records.length === 0) {
        // no records should produce a file with just the header, unparse throws an error when called with []
        result = '';
      } else {
        result = this.dvaRecordParser.unparse(records);
      }
    } catch (e) {
      throw new FileGenerationError(`FixedWidthTextFileGenerator::createFile: Failed to unparse records to txt. ${(e as Error).message}`, {
        event: BusinessTelemetryEvent.RES_DVA_FILE_GENERATION_ERROR,
      });
    }
    logger.info('FixedWidthTextFileGenerator::createFile: Successfully parsed records to txt', { sequenceNumber });
    const fileContent = header
      .concat('\n')
      .concat(result)
      .replace(/\r?\n/g, '\r\n');
    return fileContent;
  }

  private createHeader(headerParams: Record<string, string>): string {
    logger.info('FixedWidthTextFileGenerator::createHeader: Parsing header to txt', { headerParams });
    let result;
    try {
      result = this.dvaHeaderParser.unparse([headerParams]);
    } catch (e) {
      throw new FileGenerationError(`FixedWidthTextFileGenerator::createHeader: Failed to unparse header to txt. ${(e as Error).message}`, {
        event: BusinessTelemetryEvent.RES_DVA_FILE_GENERATION_ERROR,
      });
    }
    logger.info('FixedWidthTextFileGenerator::createHeader: Successfully parsed header to txt', { result });
    return result;
  }

  private static getIncrementNumber = (files?: string[]): number => {
    const SEQUENCE_OFFSET = 12;
    const BASE_10 = 10;

    if (files && files.length > 0) {
      const sortedFiles = files.sort((file1, file2) => {
        const sequence1 = file1.substr(SEQUENCE_OFFSET);
        const sequence2 = file2.substr(SEQUENCE_OFFSET);

        return sequence1 > sequence2 ? 1 : -1;
      });
      const highestIncrementNumber = sortedFiles.pop()?.substr(SEQUENCE_OFFSET);
      const parsedIncrementNumber = Number.parseInt(highestIncrementNumber as string, BASE_10) + 1;
      logger.info('FixedWidthTextFileGenerator::getIncrementNumber: Next increment number', { parsedIncrementNumber });

      return parsedIncrementNumber;
    }
    return 1;
  };
}

export const newFixedWidthTextFileGenerator = (dvaHeaderTemplate: ParseConfigInput[], dvaRecordTemplate: ParseConfigInput[]): FixedWidthTextFileGenerator => new FixedWidthTextFileGenerator(
  new FixedWidthParser(dvaHeaderTemplate, { truncate: false }),
  new FixedWidthParser(dvaRecordTemplate, { truncate: false }),
);
