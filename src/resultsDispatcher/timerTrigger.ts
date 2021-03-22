/* eslint-disable @typescript-eslint/no-unused-vars */
import { AzureFunction, Context } from '@azure/functions';
import { newResultsDispatcher } from './resultsDispatcher';
import handleError from '../error/handleError';

export const timerTrigger: AzureFunction = async function resultsDispatcherTimerTrigger(_context: Context): Promise<void> {
  try {
    await newResultsDispatcher().dispatchResults();
  } catch (error) {
    handleError(error);
  }
};
