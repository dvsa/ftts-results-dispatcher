import * as JEST_DATE_MOCK from 'jest-date-mock';
import FixedWidthParser from 'fixed-width-parser';
import { mock } from 'jest-mock-extended';
import { dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate } from '../../../src/dva/templates/dvaLearnerTemplate';
import { dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate } from '../../../src/dva/templates/dvaInstructorTemplate';
import { FixedWidthTextFileGenerator, newFixedWidthTextFileGenerator } from '../../../src/dva/fixedWidthTextFileGenerator';
import { FileGenerationError } from '../../../src/tars/fileGenerationError';
import {
  mockLearnerCrmResults, mockLearnerResultRecord, mockAdiCrmResults, mockAdiResultRecord,
} from '../../mocks/resultRecord.mock';

import { zeroFill } from '../../../src/utils/string';
import { DvaTestType, dvaTestTypeToFileNameConstant } from '../../../src/dva/enums';
import { developmentFileListWithoutPath } from '../../mocks/fileList.mock';

jest.mock('../../../src/observability/logger');

const TODAY = new Date('2020-08-02T00:00:00.000Z');
const learnerConstant = 'DVTARESUL';
const instructorConstant = '3DADIRESUL';
const mockSequenceNumber = 1001;
const mockFileDate = '12122020';
const mockFileSequence = zeroFill(mockSequenceNumber, 6);
const numberOfLearnerResults = zeroFill(mockLearnerCrmResults.length, 6);
const numberOfInstructorResults = zeroFill(mockAdiCrmResults.length, 6);

const mockLearnerHeaderParams: Record<string, string> = {
  constant: learnerConstant,
  fileSequence: mockFileSequence,
  numberOfRecords: numberOfLearnerResults,
};

const mockInstructorHeaderParams: Record<string, string> = {
  constant: instructorConstant,
  fileSequence: mockFileSequence,
  fileDate: mockFileDate,
  numberOfRecords: numberOfInstructorResults,
};

describe('FixedWidthTextFileGenerator', () => {
  beforeEach(() => {
    JEST_DATE_MOCK.advanceTo(TODAY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFile', () => {
    test('GIVEN Learner CRM test results and file sequence number WHEN createFile THEN file content is generated', () => {
      const fixedWidthTextFileGenerator = newFixedWidthTextFileGenerator(dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate);

      const result = fixedWidthTextFileGenerator.createFile(mockLearnerResultRecord, mockLearnerHeaderParams);

      const expectedHeader = `${learnerConstant}${mockFileSequence}${numberOfLearnerResults}`;
      const expectedFirstRow = 'I17874131        TMR          TESTER-SON                                 0120062021999999999P';
      const expectedSecondRow = 'IPAULF152143RS8IVPMISS        MCTESTFACE                                 0203122020000000000F';
      expect(result).toBe(`${expectedHeader}\r\n${expectedFirstRow}\r\n${expectedSecondRow}`);
    });

    test('GIVEN Instructor CRM test results and file sequence number WHEN createFile THEN file content is generated', () => {
      const fixedWidthTextFileGenerator = newFixedWidthTextFileGenerator(dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate);

      const result = fixedWidthTextFileGenerator.createFile(mockAdiResultRecord, mockInstructorHeaderParams);

      const expectedHeader = `${instructorConstant}${mockFileSequence}${mockFileDate}${numberOfInstructorResults}`;
      const expectedFirstRow = '112345678        0000000000321971JONES                                      MOCKADDRESSLINE1              MOCKADDRESSLINE2              MOCKADDRESSLINE3              MOCKADDRESSLINE4              MOCKADDRESSLINE5              B15 2AJ   05072021P022023024018087021';
      const expectedSecondRow = '165735683        0000000000321971BRADLEY                                    MOCKADDRESSLINE1              MOCKADDRESSLINE2              MOCKADDRESSLINE3              MOCKADDRESSLINE4              MOCKADDRESSLINE5              B15 2AJ   05072021F010014008016048021';
      const expectedThirdRow = '166735683        0000000000321971COOPER                                     MOCKADDRESSLINE1              MOCKADDRESSLINE2              MOCKADDRESSLINE3              MOCKADDRESSLINE4              MOCKADDRESSLINE5              B15 2AJ   05072021N000000000000000000';
      expect(result).toBe(`${expectedHeader}\r\n${expectedFirstRow}\r\n${expectedSecondRow}\r\n${expectedThirdRow}`);
    });

    test('GIVEN no learner CRM test results (empty list) and file sequence number WHEN function called THEN only the header forms part of the file contents', () => {
      const fixedWidthTextFileGenerator = newFixedWidthTextFileGenerator(dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate);
      const noRecords = zeroFill(0, 6);

      const result = fixedWidthTextFileGenerator.createFile([], { ...mockLearnerHeaderParams, numberOfRecords: noRecords });

      const expectedHeader = `${learnerConstant}${mockFileSequence}${noRecords}`;
      expect(result).toBe(`${expectedHeader}\r\n`);
    });

    test('GIVEN no instructor CRM test results (empty list) and file sequence number WHEN function called THEN only the header forms part of the file contents', () => {
      const fixedWidthTextFileGenerator = newFixedWidthTextFileGenerator(dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate);
      const noRecords = zeroFill(0, 6);

      const result = fixedWidthTextFileGenerator.createFile([], { ...mockInstructorHeaderParams, numberOfRecords: noRecords });

      const expectedHeader = `${instructorConstant}${mockFileSequence}${mockFileDate}${noRecords}`;
      expect(result).toBe(`${expectedHeader}\r\n`);
    });

    describe('errors', () => {
      test('GIVEN header parser fails WHEN function called THEN FileGenerationError is thrown', () => {
        const mockedHeaderParser = mock<FixedWidthParser>();
        const mockedRecordParser = mock<FixedWidthParser>();
        const mockError = new Error('Header parser failure');
        mockedHeaderParser.unparse.mockImplementation(() => {
          throw mockError;
        });
        const fixedWidthTextFileGenerator = new FixedWidthTextFileGenerator(
          mockedHeaderParser,
          mockedRecordParser,
        );

        expect(() => fixedWidthTextFileGenerator.createFile(mockLearnerResultRecord, mockLearnerHeaderParams)).toThrow(FileGenerationError);
        expect(() => fixedWidthTextFileGenerator.createFile(mockAdiResultRecord, mockInstructorHeaderParams)).toThrow(FileGenerationError);
      });

      test('GIVEN record parser fails WHEN function called THEN FileGenerationError is thrown', () => {
        const mockedHeaderParser = mock<FixedWidthParser>();
        const mockedRecordParser = mock<FixedWidthParser>();
        const mockError = new Error('Record parser failure');
        mockedRecordParser.unparse.mockImplementation(() => {
          throw mockError;
        });
        const fixedWidthTextFileGenerator = new FixedWidthTextFileGenerator(
          mockedHeaderParser,
          mockedRecordParser,
        );

        expect(() => fixedWidthTextFileGenerator.createFile(mockLearnerResultRecord, mockLearnerHeaderParams)).toThrow(FileGenerationError);
        expect(() => fixedWidthTextFileGenerator.createFile(mockAdiResultRecord, mockInstructorHeaderParams)).toThrow(FileGenerationError);
      });
    });
  });

  describe('createFileName', () => {
    test('DVA Learner - GIVEN a list of file names of the same date and result file type WHEN function called THEN appropriate file name is generated', () => {
      const mockFilesList = developmentFileListWithoutPath();

      const expectedFilePrefix = dvaTestTypeToFileNameConstant.get(DvaTestType.LEARNER);
      const expectedFileDate = 20200801;
      const expectedSequenceNumber = '06';

      const fileName = FixedWidthTextFileGenerator.createFileName(mockSequenceNumber, DvaTestType.LEARNER, mockFilesList);

      expect(fileName).toEqual(`${expectedFilePrefix || ''}${expectedFileDate}${expectedSequenceNumber}.txt`);
    });

    test('DVA Learner - GIVEN an empty list of file names and result file type WHEN function called THEN appropriate file name is generated with sequence number as 01', () => {
      const mockFilesList: string[] = [];
      const expectedFilePrefix = dvaTestTypeToFileNameConstant.get(DvaTestType.LEARNER);
      const expectedFileDate = 20200801;
      const paddedMockSequenceNumber = '01';

      const fileName = FixedWidthTextFileGenerator.createFileName(mockSequenceNumber, DvaTestType.LEARNER, mockFilesList);

      expect(fileName).toEqual(`${expectedFilePrefix || ''}${expectedFileDate}${paddedMockSequenceNumber}.txt`);
    });

    test('DVA Learner - GIVEN a list of file names with the highest sequence number being 99 WHEN function called THEN file name is generated using sequence number as 100', () => {
      const mockFilesList = ['DVTA2020080199.txt'];

      const expectedFilePrefix = dvaTestTypeToFileNameConstant.get(DvaTestType.LEARNER);
      const expectedFileDate = 20200801;
      const expectedSequenceNumber = '100';

      const fileName = FixedWidthTextFileGenerator.createFileName(mockSequenceNumber, DvaTestType.LEARNER, mockFilesList);

      expect(fileName).toEqual(`${expectedFilePrefix || ''}${expectedFileDate}${expectedSequenceNumber}.txt`);
    });

    test.each([
      [DvaTestType.ADI, '01082020'],
      [DvaTestType.AMI, '01082020'],
    ])('DVA %s - GIVEN a sequence number and result file type WHEN function called THEN appropriate file name is generated', (resultsFileType, expectedFileDate) => {
      const expectedFilePrefix = dvaTestTypeToFileNameConstant.get(resultsFileType);

      const fileName = FixedWidthTextFileGenerator.createFileName(mockSequenceNumber, resultsFileType);

      expect(fileName).toEqual(`${expectedFilePrefix || ''}${expectedFileDate}00${mockSequenceNumber}.txt`);
    });
  });
});
