import { AzureFunction, Context } from '@azure/functions';
import { dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate } from '../dva/templates/dvaInstructorTemplate';
import { handleDvaError } from '../error/handleError';
import { newDvaResultsDispatcher } from '../dva/dvaResultsDispatcher';
import { DvaTestType } from '../dva/enums';
import { validateDvaInstructorTestResult } from '../validation/validateSchema';
import config from '../config';
import { getUnprocessedStatus } from '../utils/getUnprocessedStatus';

export const timerTrigger: AzureFunction = async function dvaAdiResultsDispatcherTimerTrigger(context: Context): Promise<void> {
  try {
    const unprocessedStatus = getUnprocessedStatus(context.bindingData.dvaAdiResultsDispatcher);
    await newDvaResultsDispatcher(
      dvaInstructorHeaderTemplate,
      dvaInstructorRecordTemplate,
      unprocessedStatus,
    ).dispatchResults(
      DvaTestType.ADI,
      config.dva.metadataFilename.adi,
      validateDvaInstructorTestResult,
    );
  } catch (error) {
    handleDvaError(error as Error);
  }
};
