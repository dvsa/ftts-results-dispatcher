import config from '../../config';
import { BusinessTelemetryEvent, logger } from '../../observability/logger';
import { cleanAndRemovePunctuation } from '../../utils/string';
import { DvaInstructorTestResultModel } from './dvaInstructorTestResultModel';
import { CRMProductNumber } from './productNumber';

export interface DvaCrmBandScoreAggregate {
  ftts_testhistoryid: string;
  ftts_mcqtotalscore: number;
  productnumber: string;
  ftts_paymentreferencenumber: string;
  candidateTotalPerBand: number;
  ftts_topic: string;
}

export const populateBandScores = (testType: CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1, testResults: DvaInstructorTestResultModel[], bandScores: DvaCrmBandScoreAggregate[]): void => {
  const bandTopics = (testType === CRMProductNumber.ADIP1DVA) ? config.dva.adiBands : config.dva.amiBands;

  testResults.forEach((result) => {
    const bandScoresForGivenTestHistoryId = bandScores.filter((scoreEntry) => result.id === scoreEntry.ftts_testhistoryid);
    result.bandScore1 = getBandScoreByTopic(bandTopics.band1, bandScoresForGivenTestHistoryId);
    result.bandScore2 = getBandScoreByTopic(bandTopics.band2, bandScoresForGivenTestHistoryId);
    result.bandScore3 = getBandScoreByTopic(bandTopics.band3, bandScoresForGivenTestHistoryId);
    result.bandScore4 = getBandScoreByTopic(bandTopics.band4, bandScoresForGivenTestHistoryId);
    result.overallScore = bandScoresForGivenTestHistoryId[0]?.ftts_mcqtotalscore || 0; // default to 0 if not present
    checkBandScoresEqualOverallScore(result);
  });
};

export const getBandScoreByTopic = (topic: string, bandScores: DvaCrmBandScoreAggregate[]): number => {
  // Ignore punctuation and capitilisation differences when looking for the band topic
  const band = bandScores.find((bandScoreEntry) => bandScoreEntry.ftts_topic && cleanAndRemovePunctuation(topic) === cleanAndRemovePunctuation(bandScoreEntry.ftts_topic));
  return (band) ? band?.candidateTotalPerBand : 0;
};

/**
 * Sending of the DVA instructor results file should not be stopped due to a calculations mismatch.
 * Band calculations are only supplementary and do not affect the test status (pass or fail)!
 * @param result A mapped DVA instructor ADI/AMI entity containing bandScore 1 to 4 and an overall score
 */
export const checkBandScoresEqualOverallScore = (result: DvaInstructorTestResultModel): void => {
  const bandScores = [result.bandScore1, result.bandScore2, result.bandScore3, result.bandScore4];
  const sumOfBandScores = bandScores.reduce((acc: number, val) => acc + (val || 0), 0);

  if (sumOfBandScores !== result.overallScore) {
    const logMessage = `Sum of MCQ band scores=${sumOfBandScores} for test history id ${result.id} does not match the overall test history score=${String(result.overallScore)}`;
    logger.event(BusinessTelemetryEvent.RES_DVA_CDS_BAND_SCORE_RETRIEVAL_WARNING, `checkBandScoresEqualOverallScore:: ${logMessage}`);
  }
};
