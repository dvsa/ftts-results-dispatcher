import 'jest-xml-matcher';
import xml2js from 'xml2js';
import { mock } from 'jest-mock-extended';
import { mockedLogger } from '../../mocks/logger.mock';
import { XmlTestResultsFileGenerator, newXmlTestResultsFileGenerator } from '../../../src/tars/xmlTestResultsFileGenerator';
import { BasicTarsMetadata } from '../../../src/metadata/metadata';
import { TarsTestResultModel, TarsCrmTestResult } from '../../../src/crm/testResults/tarsTestResultModel';
import { TestStatus } from '../../../src/crm/testResults/testStatus';
import { CrmTitle } from '../../../src/crm/testResults/title';
import { FileGenerationError } from '../../../src/tars/fileGenerationError';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { TarsResultType } from '../../../src/tars/result';

jest.mock('../../../src/observability/logger');

const mockedBuilder = mock<xml2js.Builder>();

describe('XmlTestResultsFileGenerator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFileName', () => {
    const CREATED = new Date('2020-08-01');

    test('GIVEN metadata AND resultType WHEN called THEN a filename is returned', () => {
      const basicMetadata: BasicTarsMetadata = {
        sequenceNumber: 2,
        dailySequenceNumber: '3',
        created: CREATED,
      };
      const resultType = TarsResultType.RESULT;
      const negatedResultType = TarsResultType.NEGATED_RESULT;

      const xmlTestResultsFileGenerator: XmlTestResultsFileGenerator = newXmlTestResultsFileGenerator();
      const fileName1 = xmlTestResultsFileGenerator.createFileName(basicMetadata, TarsResultType.RESULT);
      const fileName2 = xmlTestResultsFileGenerator.createFileName(basicMetadata, TarsResultType.NEGATED_RESULT);

      expect(fileName1).toEqual(`TARS20200801${basicMetadata.dailySequenceNumber}${resultType}.xml`);
      expect(fileName2).toEqual(`TARS20200801${basicMetadata.dailySequenceNumber}${negatedResultType}.xml`);
    });
  });

  describe('createFile', () => {
    const CREATED = new Date('2020-08-01');

    const basicMetadata: BasicTarsMetadata = {
      sequenceNumber: 1000000,
      dailySequenceNumber: '001',
      created: CREATED,
    };

    const testResults: TarsTestResultModel[] = [
      new TarsTestResultModel({
        ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
        ftts_certificatenumber: '999999999',
        ftts_teststatus: TestStatus.FAIL,
        ftts_textlanguage: 1,
        ftts_starttime: new Date('2020-06-26'),
        'person.address1_line1': 'address line 1',
        'person.address1_line2': 'address line 2',
        'person.address1_line3': 'address line 3',
        'person.address1_city': 'address city',
        'person.address1_county': 'address county',
        'person.address1_postalcode': 'postalcode',
        'person.ftts_adiprn': '10',
        'person.gendercode': 2,
        'person.ftts_title': CrmTitle.Miss,
        'person.firstname': 'Ellie',
        'person.lastname': 'Walker',
        'person.birthdate': '1989-03-12',
        'person.licence.ftts_licence': '20406011',
        'product.ftts_examseriescode': 'LGV',
        'bookingproduct.ftts_reference': 'C-000-016-055-04',
      } as TarsCrmTestResult),
    ];

    test('GIVEN test results AND metadata WHEN called AND fails THEN an error is thrown ', () => {
      const errorMessage = 'my error message';
      const xmlTestResultsFileGenerator: XmlTestResultsFileGenerator = new XmlTestResultsFileGenerator(
        mockedBuilder,
      );
      mockedBuilder.buildObject.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      try {
        xmlTestResultsFileGenerator.createFile(testResults, basicMetadata, TarsResultType.RESULT);
        fail();
      } catch (error) {
        expect(mockedLogger.event).toHaveBeenCalledWith(
          BusinessTelemetryEvent.RES_TARS_RESULTS_FILE_GENERATION_ERROR,
        );
        expect(error).toEqual(new FileGenerationError(`XmlTestResultsFileGenerator::createFile: Failed to create a XML test results file. ${errorMessage}`));
      }
    });

    test('GIVEN test results AND metadata WHEN called THEN an xml file is returned', () => {
      const xmlTestResultsFileGenerator: XmlTestResultsFileGenerator = newXmlTestResultsFileGenerator();

      const file = xmlTestResultsFileGenerator.createFile(testResults, basicMetadata, TarsResultType.RESULT);

      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'XmlTestResultsFileGenerator::createFile: Starting create a XML test results file',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'XmlTestResultsFileGenerator::createFile: Successfully created a XML test results file',
      );
      expect(file).toEqualXML(`
        <?xml version="1.0" encoding="iso-8859-1"?>
        <TTResults_Message_Group xmlns="uri:DSATheoryTest">
          <MsgHeader DailyFileSequenceNumber="001" FileSequenceNumber="1000000" ProcessedDate="01/08/2020" RecordCount="1"/>
          <Candidate CandReference="1">
            <CandContactDetails>
              <AddressLine1>address line 1</AddressLine1>
              <AddressLine2>address line 2</AddressLine2>
              <AddressLine3>address line 3</AddressLine3>
              <AddressLine4>address city</AddressLine4>
              <AddressLine5>address county</AddressLine5>
              <PostCode>postalcode</PostCode>
            </CandContactDetails>
            <CandPersonalDetails>
              <DriverNumber>20406011</DriverNumber>
              <ADIPRN>10</ADIPRN>
              <Gender>F</Gender>
              <Title>Miss</Title>
              <Surname>Walker</Surname>
              <Forenames>Ellie</Forenames>
              <DOB>12/03/1989</DOB>
            </CandPersonalDetails>
            <Result>
              <SessionPaperID>000016055</SessionPaperID>
              <ExamSeriesCode>LGV</ExamSeriesCode>
              <LanguageID>ENG</LanguageID>
              <Version>1</Version>
              <FormName>LGV</FormName>
              <CertificateNumber>999999999</CertificateNumber>
              <TestSessionDate>26/06/2020</TestSessionDate>
              <TestResult>F</TestResult>
            </Result>
          </Candidate>
          <MsgTrailer DailyFileSequenceNumber="001" FileSequenceNumber="1000000" RecordCount="1"/>
        </TTResults_Message_Group>`);
    });

    test('GIVEN test results with some undefined values AND metadata WHEN called THEN an xml file is returned without empty tags', () => {
      const xmlTestResultsFileGenerator: XmlTestResultsFileGenerator = newXmlTestResultsFileGenerator();

      const malformedTestResults = testResults;
      delete malformedTestResults[0].adiprn;
      delete malformedTestResults[0].addressLine2;

      const file = xmlTestResultsFileGenerator.createFile(malformedTestResults, basicMetadata, TarsResultType.RESULT);

      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'XmlTestResultsFileGenerator::createFile: Starting create a XML test results file',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'XmlTestResultsFileGenerator::createFile: Successfully created a XML test results file',
      );
      expect(file).toEqualXML(`
        <?xml version="1.0" encoding="iso-8859-1"?>
        <TTResults_Message_Group xmlns="uri:DSATheoryTest">
          <MsgHeader DailyFileSequenceNumber="001" FileSequenceNumber="1000000" ProcessedDate="01/08/2020" RecordCount="1"/>
          <Candidate CandReference="1">
            <CandContactDetails>
              <AddressLine1>address line 1</AddressLine1>
              <AddressLine3>address line 3</AddressLine3>
              <AddressLine4>address city</AddressLine4>
              <AddressLine5>address county</AddressLine5>
              <PostCode>postalcode</PostCode>
            </CandContactDetails>
            <CandPersonalDetails>
              <DriverNumber>20406011</DriverNumber>
              <Gender>F</Gender>
              <Title>Miss</Title>
              <Surname>Walker</Surname>
              <Forenames>Ellie</Forenames>
              <DOB>12/03/1989</DOB>
            </CandPersonalDetails>
            <Result>
              <SessionPaperID>000016055</SessionPaperID>
              <ExamSeriesCode>LGV</ExamSeriesCode>
              <LanguageID>ENG</LanguageID>
              <Version>1</Version>
              <FormName>LGV</FormName>
              <CertificateNumber>999999999</CertificateNumber>
              <TestSessionDate>26/06/2020</TestSessionDate>
              <TestResult>F</TestResult>
            </Result>
          </Candidate>
          <MsgTrailer DailyFileSequenceNumber="001" FileSequenceNumber="1000000" RecordCount="1"/>
        </TTResults_Message_Group>`);
    });

    test('GIVEN generated XML template is invalid WHEN called THEN an error is thrown containing validation errors', () => {
      const xmlTestResultsFileGenerator: XmlTestResultsFileGenerator = newXmlTestResultsFileGenerator();
      const invalidBasicMetadata = { ...basicMetadata, sequenceNumber: 1000000.1 }; // Not an integer
      const expectedErrorsArray = [
        {
          dataPath: '.TTResults_Message_Group.MsgHeader.$.FileSequenceNumber',
          errorMessage: 'should be integer',
          params: { type: 'integer' },
        },
        {
          dataPath: '.TTResults_Message_Group.MsgTrailer.$.FileSequenceNumber',
          errorMessage: 'should be integer',
          params: { type: 'integer' },
        },
      ];

      expect(() => xmlTestResultsFileGenerator.createFile(testResults, invalidBasicMetadata as any, TarsResultType.RESULT)).toThrow(
        `XmlTestResultsFileGenerator::createFile: Failed to create a XML test results file. XML schema validation failed: ${JSON.stringify(expectedErrorsArray)}`,
      );
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvent.RES_TARS_SCHEMA_VALIDATION_ERROR,
        'XmlTestResultsFileGenerator::createFile: XML schema validation failed',
        {
          sequenceNumber: invalidBasicMetadata.sequenceNumber,
          validationErrors: expectedErrorsArray,
        },
      );
    });
  });
});
