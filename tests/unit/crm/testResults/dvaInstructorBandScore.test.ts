import { mockedConfig } from '../../../mocks/config.mock';
import { mockedLogger } from '../../../mocks/logger.mock';
import {
  checkBandScoresEqualOverallScore,
  DvaCrmBandScoreAggregate,
  getBandScoreByTopic,
  populateBandScores,
} from '../../../../src/crm/testResults/dvaInstructorBandScore';
import { CRMProductNumber } from '../../../../src/crm/testResults/productNumber';
import { DvaInstructorTestResultModel } from '../../../../src/crm/testResults/dvaInstructorTestResultModel';
import { BusinessTelemetryEvent } from '../../../../src/observability/logger';

describe('dvaInstructorBandScore', () => {
  let mockBandScores: DvaCrmBandScoreAggregate[];

  const mockAmiInstructorBands = {
    band1: 'Road Procedure Rider Safety',
    band2: 'Driving Test Disabilities, The Law The Environment ',
    band3: 'Traffic Signs and Signals bike control, pedestrians, mechanical Knowledge',
    band4: 'publications,  instructional Techniques',
  };

  const mockAdiInstructorBands = {
    band1: 'Road Procedure',
    band2: 'Driving Test Disabilities, Law',
    band3: 'Traffic Signs and Signals car control, pedestrians, mechanical Knowledge',
    band4: 'publications,  instructional Techniques',
  };

  const generateMockBandScore = (testHistoryId: string, topic: string, bandScore: number, total: number): DvaCrmBandScoreAggregate => ({
    ftts_testhistoryid: testHistoryId,
    ftts_mcqtotalscore: total,
    productnumber: 'productNumber',
    ftts_paymentreferencenumber: '72814694',
    candidateTotalPerBand: bandScore,
    ftts_topic: topic,
  });

  const mockTestResult = (testHistoryId: string): DvaInstructorTestResultModel => ({
    id: testHistoryId,
    testStatus: 'Pass',
    startTime: '2020-06-26T00:00:00.000Z',
    addressLine1: 'adress line 1',
    addressLine2: 'address line 2',
    addressLine3: 'address line 3',
    addressLine4: 'address city',
    addressLine5: 'address county',
    postCode: 'example code',
    adiprn: 'adiprn',
    paymentReferenceNumber: '72814694',
    lastName: 'Walker',
    birthDate: '1989-03-12',
    driverNumber: '20406011',
    bookingReference: 'C-000-016-055-04',
    hptScore: 93,
    certificateNumber: undefined,
    firstName: undefined,
    textLanguage: undefined,
    title: undefined,
  });

  const assertBandScoresOnResult = (testResult: DvaInstructorTestResultModel, bandScoresInOrder: [number, number, number, number]): void => {
    expect([testResult?.bandScore1, testResult?.bandScore2, testResult?.bandScore3, testResult?.bandScore4]).toStrictEqual(bandScoresInOrder);
  };

  beforeEach(() => {
    mockedConfig.dva.amiBands = mockAmiInstructorBands;
    mockedConfig.dva.adiBands = mockAdiInstructorBands;
    mockBandScores = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('populateBandScores', () => {
    test.each([
      CRMProductNumber.ADIP1DVA,
      CRMProductNumber.AMIP1,
    ])('GIVEN no test results and no band scores THEN do nothing', (testType) => {
      const testResults: DvaInstructorTestResultModel[] = [];

      populateBandScores(
        testType as CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1,
        testResults,
        [],
      );

      expect(testResults).toHaveLength(0);
    });

    test.each([
      CRMProductNumber.ADIP1DVA,
      CRMProductNumber.AMIP1,
    ])('GIVEN test results and no band scores WHEN called THEN return the test results with band scores and overall score defaulted to 0', (testType) => {
      const testResults = [mockTestResult('testHistoryId1'), mockTestResult('testHistoryId2')];

      populateBandScores(
        testType as CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1,
        testResults,
        [],
      );

      testResults.forEach((result) => {
        expect(result.bandScore1).toBe(0);
        expect(result.bandScore2).toBe(0);
        expect(result.bandScore3).toBe(0);
        expect(result.bandScore4).toBe(0);
        expect(result.overallScore).toBe(0);
      });
    });

    test('GIVEN ADI test results and band scores WHEN called THEN return the test results with band scores and overall score correctly populated', () => {
      const firstTestTotal = 18 + 12 + 20 + 22;
      const secondTestTotal = 17 + 13 + 24 + 25;

      mockBandScores = [
        generateMockBandScore('testHistoryId1', mockedConfig.dva.adiBands.band1, 18, firstTestTotal),
        generateMockBandScore('testHistoryId1', mockedConfig.dva.adiBands.band2, 12, firstTestTotal),
        generateMockBandScore('testHistoryId1', mockedConfig.dva.adiBands.band3, 20, firstTestTotal),
        generateMockBandScore('testHistoryId1', mockedConfig.dva.adiBands.band4, 22, firstTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.adiBands.band1, 17, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.adiBands.band2, 13, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.adiBands.band3, 24, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.adiBands.band4, 25, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.amiBands.band4, 10, 50), // band with a non-ADI topic - should not be picked up
      ];

      const testResults = [mockTestResult('testHistoryId1'), mockTestResult('testHistoryId2')];

      populateBandScores(
        CRMProductNumber.ADIP1DVA,
        testResults,
        mockBandScores,
      );

      expect(testResults).toHaveLength(2);
      assertBandScoresOnResult(testResults[0], [18, 12, 20, 22]);
      expect(testResults[0].overallScore).toBe(firstTestTotal);
      assertBandScoresOnResult(testResults[1], [17, 13, 24, 25]);
      expect(testResults[1].overallScore).toBe(secondTestTotal);
    });

    test('GIVEN AMI test results and band scores WHEN called THEN return the test results with band scores and overall score correctly populated', () => {
      const firstTestTotal = 11 + 18 + 25 + 22;
      const secondTestTotal = 21 + 24 + 7 + 19;

      mockBandScores = [
        generateMockBandScore('testHistoryId1', mockedConfig.dva.amiBands.band1, 11, firstTestTotal),
        generateMockBandScore('testHistoryId1', mockedConfig.dva.amiBands.band2, 18, firstTestTotal),
        generateMockBandScore('testHistoryId1', mockedConfig.dva.amiBands.band3, 25, firstTestTotal),
        generateMockBandScore('testHistoryId1', mockedConfig.dva.amiBands.band4, 22, firstTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.amiBands.band1, 21, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.amiBands.band2, 24, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.amiBands.band3, 7, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.amiBands.band4, 19, secondTestTotal),
        generateMockBandScore('testHistoryId2', mockedConfig.dva.adiBands.band4, 10, 40), // band with a non-AMI topic - should not be picked up
      ];

      const testResults = [mockTestResult('testHistoryId1'), mockTestResult('testHistoryId2')];

      populateBandScores(
        CRMProductNumber.AMIP1,
        testResults,
        mockBandScores,
      );

      expect(testResults).toHaveLength(2);
      assertBandScoresOnResult(testResults[0], [11, 18, 25, 22]);
      expect(testResults[0].overallScore).toBe(firstTestTotal);
      assertBandScoresOnResult(testResults[1], [21, 24, 7, 19]);
      expect(testResults[1].overallScore).toBe(secondTestTotal);
    });
  });

  describe('getBandScoreByTopic', () => {
    beforeEach(() => {
      mockBandScores = [
        generateMockBandScore('testHistoryId', mockAmiInstructorBands.band1, 20, 42),
        generateMockBandScore('testHistoryId', mockAmiInstructorBands.band2, 22, 42),
        generateMockBandScore('testHistoryId', undefined as unknown as string, 10, 42), // undefined ftts_topic
      ];
    });

    test.each([
      ['Road Procedure & Rider Safety', 20],
      ['Driving Test, Disabilities, The Law & The Environment', 22],
    ])('GIVEN a topic which matches the ftts_topic field in a list of band score results after string sanitisation THEN return the score for the matching topic', (topic, expectedScore) => {
      expect(getBandScoreByTopic(topic, mockBandScores)).toBe(expectedScore);
    });

    test('GIVEN a topic with no bands scores result matching after string sanitisation THEN return 0', () => {
      expect(getBandScoreByTopic('Publications, Instructional Techniques', mockBandScores)).toBe(0);
    });

    test('GIVEN a topic and an empty list of bands score results THEN return 0', () => {
      expect(getBandScoreByTopic('Road Procedure & Rider Safety', [])).toBe(0);
    });
  });

  describe('checkBandScoresEqualOverallScore', () => {
    test('GIVEN a test result which does not have any band scores and total does not match the overall score THEN log', () => {
      checkBandScoresEqualOverallScore(mockTestResult('testHistoryId1'));

      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvent.RES_DVA_CDS_BAND_SCORE_RETRIEVAL_WARNING,
        'checkBandScoresEqualOverallScore:: Sum of MCQ band scores=0 for test history id testHistoryId1 does not match the overall test history score=undefined',
      );
    });

    test('GIVEN a test result which does not have all band scores and total does not match the overall score THEN log', () => {
      const partialBandScores = { bandScore1: 25, bandScore2: 24, overallScore: 75 };
      checkBandScoresEqualOverallScore({ ...mockTestResult('testHistoryId1'), ...partialBandScores });

      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvent.RES_DVA_CDS_BAND_SCORE_RETRIEVAL_WARNING,
        `checkBandScoresEqualOverallScore:: Sum of MCQ band scores=${24 + 25} for test history id testHistoryId1 does not match the overall test history score=${partialBandScores.overallScore}`,
      );
    });

    test('GIVEN a test result with all band scores but the total does not match the overall score THEN log', () => {
      const allBandScores = {
        bandScore1: 25,
        bandScore2: 24,
        bandScore3: 19,
        bandScore4: 22,
        overallScore: 75,
      };
      checkBandScoresEqualOverallScore({ ...mockTestResult('testHistoryId1'), ...allBandScores });

      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvent.RES_DVA_CDS_BAND_SCORE_RETRIEVAL_WARNING,
        `checkBandScoresEqualOverallScore:: Sum of MCQ band scores=${24 + 25 + 19 + 22} for test history id testHistoryId1 does not match the overall test history score=${allBandScores.overallScore}`,
      );
    });

    test('GIVEN a test result with all band scores and a total matching the overall score THEN do not log', () => {
      const allBandScores = {
        bandScore1: 25,
        bandScore2: 24,
        bandScore3: 19,
        bandScore4: 22,
        overallScore: 24 + 25 + 19 + 22,
      };
      checkBandScoresEqualOverallScore({ ...mockTestResult('testHistoryId1'), ...allBandScores });

      expect(mockedLogger.info).toHaveBeenCalledTimes(0);
    });
  });
});
