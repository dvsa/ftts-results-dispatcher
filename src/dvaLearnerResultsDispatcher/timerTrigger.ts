import { AzureFunction, Context } from '@azure/functions';
import config from '../config';
import { newDvaResultsDispatcher } from '../dva/dvaResultsDispatcher';
import { DvaTestType } from '../dva/enums';
import { dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate } from '../dva/templates/dvaLearnerTemplate';
import { validateDvaLearnerTestResult } from '../validation/validateSchema';
import { handleDvaError } from '../error/handleError';
import { getUnprocessedStatus } from '../utils/getUnprocessedStatus';

export const timerTrigger: AzureFunction = async function learnerResultsDispatcherTimerTrigger(context: Context): Promise<void> {
  try {
    const unprocessedStatus = getUnprocessedStatus(context.bindingData.dvaLearnerResultsDispatcher);
    await newDvaResultsDispatcher(
      dvaLearnerHeaderTemplate,
      dvaLearnerRecordTemplate,
      unprocessedStatus,
    ).dispatchResults(
      DvaTestType.LEARNER,
      config.dva.metadataFilename.dva,
      validateDvaLearnerTestResult,
    );
  } catch (error) {
    handleDvaError(error as Error);
  }
};
