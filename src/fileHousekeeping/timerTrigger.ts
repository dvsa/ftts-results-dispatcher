/* eslint-disable @typescript-eslint/no-unused-vars */
import { AzureFunction, Context } from '@azure/functions';
import { logger } from '../observability/logger';
import fileHousekeeping from './fileHousekeeping';
import handleError from '../error/handleError';

export const timerTrigger: AzureFunction = async function fileHousekeepingTimerTrigger(_context: Context): Promise<void> {
  try {
    await fileHousekeeping();
  } catch (error) {
    handleError(error as Error);
  }
};
