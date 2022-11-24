import xml2js from 'xml2js';
import { Candidate } from './candidate';
import { TarsTestResultModel } from '../crm/testResults/tarsTestResultModel';
import { BasicTarsMetadata } from '../metadata/metadata';
import { TarsResultType } from './result';
import { formatDate, DateFormat } from '../utils/formatDate';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { FileGenerationError } from './fileGenerationError';
import validateSchema, { validateTarsXmlFile } from '../validation/validateSchema';

export class XmlTestResultsFileGenerator {
  constructor(
    private xml2jsBuilder: xml2js.Builder,
  ) { }

  public createFileName(basicMetadata: BasicTarsMetadata, resultType: TarsResultType): string {
    const { created } = basicMetadata;
    const date = formatDate(created, DateFormat.yyyyMMdd) as string;
    return `TARS${date}${basicMetadata.dailySequenceNumber}${resultType}.xml`;
  }

  public createFile(crmTestResults: TarsTestResultModel[], basicMetadata: BasicTarsMetadata, resultType: TarsResultType): string {
    try {
      logger.info('XmlTestResultsFileGenerator::createFile: Starting create a XML test results file');
      const candidates: Candidate[] = [];
      crmTestResults.forEach((result) => candidates.push(new Candidate(result, resultType)));
      const candidateRecords: Record<string, unknown>[] = this.generateCandidateRecords(candidates);
      const recordCount = candidateRecords.length;
      const { sequenceNumber, dailySequenceNumber, created } = basicMetadata;
      const processedDate = formatDate(created, DateFormat['dd/MM/yyyy']);

      const XML_TEMPLATE = {
        TTResults_Message_Group: {
          $: {
            xmlns: 'uri:DSATheoryTest',
          },
          MsgHeader: {
            $: {
              DailyFileSequenceNumber: dailySequenceNumber,
              FileSequenceNumber: sequenceNumber,
              ProcessedDate: processedDate,
              RecordCount: recordCount,
            },
          },
          Candidate: [
            ...candidateRecords,
          ],
          MsgTrailer: {
            $: {
              DailyFileSequenceNumber: dailySequenceNumber,
              FileSequenceNumber: sequenceNumber,
              RecordCount: recordCount,
            },
          },
        },
      };
      const validationErrors = validateSchema(validateTarsXmlFile, XML_TEMPLATE);
      if (validationErrors) {
        logger.event(
          BusinessTelemetryEvent.RES_TARS_SCHEMA_VALIDATION_ERROR,
          'XmlTestResultsFileGenerator::createFile: XML schema validation failed',
          { sequenceNumber, validationErrors },
        );
        throw new Error(`XML schema validation failed: ${JSON.stringify(validationErrors)}`);
      }
      const generatedXmlFile = this.xml2jsBuilder.buildObject(XML_TEMPLATE);
      const xmlFile = this.removeEmptyXmlTags(generatedXmlFile);
      logger.info('XmlTestResultsFileGenerator::createFile: Successfully created a XML test results file');
      return xmlFile;
    } catch (error) {
      logger.event(BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_GENERATION_ERROR);
      throw new FileGenerationError(`XmlTestResultsFileGenerator::createFile: Failed to create a XML test results file. ${(error as Error).message}`, error);
    }
  }

  private generateCandidateRecords(candidateRecords: Candidate[]): Record<string, unknown>[] {
    const obj: Record<string, unknown>[] = [];
    candidateRecords.forEach((candidate) => {
      const candReferenceNumber = obj.length + 1;
      obj.push(
        {
          $: {
            CandReference: candReferenceNumber,
          },
          ...candidate,
        },
      );
    });
    return obj;
  }

  private removeEmptyXmlTags(xml: string): string {
    return xml.replace(/<[A-Za-z0-9]+\/>/g, '').replace(/^\s*\n/gm, '').trim();
  }
}

export const newXmlTestResultsFileGenerator = (): XmlTestResultsFileGenerator => new XmlTestResultsFileGenerator(
  new xml2js.Builder({
    xmldec: {
      version: '1.0',
      encoding: 'iso-8859-1',
    },
  }),
);
