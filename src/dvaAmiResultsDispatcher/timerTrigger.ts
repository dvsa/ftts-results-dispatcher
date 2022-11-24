import { AzureFunction, Context } from '@azure/functions';
import { dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate } from '../dva/templates/dvaInstructorTemplate';
import { handleDvaError } from '../error/handleError';
import { newDvaResultsDispatcher } from '../dva/dvaResultsDispatcher';
import { DvaTestType } from '../dva/enums';
import { validateDvaInstructorTestResult } from '../validation/validateSchema';
import config from '../config';
import { getUnprocessedStatus } from '../utils/getUnprocessedStatus';

export const timerTrigger: AzureFunction = async function dvaAmiResultsDispatcherTimerTrigger(context: Context): Promise<void> {
  try {
    const unprocessedStatus = getUnprocessedStatus(context.bindingData.dvaAmiResultsDispatcher);
    await newDvaResultsDispatcher(
      dvaInstructorHeaderTemplate,
      dvaInstructorRecordTemplate,
      unprocessedStatus,
    ).dispatchResults(
      DvaTestType.AMI,
      config.dva.metadataFilename.ami,
      validateDvaInstructorTestResult,
    );
  } catch (error) {
    handleDvaError(error as Error);
  }
};
