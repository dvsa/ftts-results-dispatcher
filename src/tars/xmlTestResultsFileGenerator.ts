import xml2js from 'xml2js';
import { Candidate } from './candidate';
import { TestResult } from '../crm/testResults/testResult';
import { BasicMetadata } from '../metadata/metadata';
import { TarsResultType } from './result';
import { formatDate, DateFormat } from '../utils/formatDate';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { FileGenerationError } from './fileGenerationError';
import validateSchema from '../validation/validateSchema';
import * as schema from './tarsFile.schema.json';

export class XmlTestResultsFileGenerator {
  constructor(
    private xml2jsBuilder: xml2js.Builder,
  ) { }

  public createFileName(basicMetadata: BasicMetadata, resultType: TarsResultType): string {
    const { created } = basicMetadata;
    const date = formatDate(created, DateFormat.yyyyMMdd);
    return `TARS${date}${basicMetadata.dailySequenceNumber}${resultType}.xml`;
  }

  public createFile(crmTestResults: TestResult[], basicMetadata: BasicMetadata, resultType: TarsResultType): string {
    try {
      logger.info('Starting create a XML test results file');
      const candidates: Candidate[] = [];
      crmTestResults.forEach((result) => candidates.push(new Candidate(result, resultType)));
      const candidateRecords: object[] = this.generateCandidateRecords(candidates);
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
      if (!validateSchema(schema, XML_TEMPLATE)) {
        throw new Error('Schema validation failed');
      }
      const generatedXmlFile = this.xml2jsBuilder.buildObject(XML_TEMPLATE);
      const xmlFile = this.removeEmptyXmlTags(generatedXmlFile);
      logger.info('Successfully created a XML test results file');
      return xmlFile;
    } catch (error) {
      logger.logEvent(BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_GENERATION_ERROR);
      throw new FileGenerationError(`Failed to create a XML test results file. ${error.message}`, error);
    }
  }

  private generateCandidateRecords(candidateRecords: Candidate[]): object[] {
    const obj: object[] = [];
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
