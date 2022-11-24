/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '../../observability/logger';

export const logWarnOnRetry = (warnMessage: string, properties?: Record<string, any>): void => {
  logger.warn(warnMessage, properties);
};
