/* eslint-disable @typescript-eslint/no-unused-vars */
import { AzureFunction, Context } from '@azure/functions';
import { newTarsResultsDispatcher } from './tarsResultsDispatcher';
import handleError from '../error/handleError';
import { getUnprocessedStatus } from '../utils/getUnprocessedStatus';

export const timerTrigger: AzureFunction = async function resultsDispatcherTimerTrigger(context: Context): Promise<void> {
  try {
    const unprocessedStatus = getUnprocessedStatus(context.bindingData.tarsResultsDispatcher);
    await newTarsResultsDispatcher(unprocessedStatus).dispatchResults();
  } catch (error) {
    handleError(error as Error);
  }
};
