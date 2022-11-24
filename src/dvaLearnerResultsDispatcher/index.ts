import { Context } from '@azure/functions';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { withEgressFiltering } from '@dvsa/egress-filtering';
import { ALLOWED_ADDRESSES, ON_INTERNAL_ACCESS_DENIED_ERROR } from '../egress';
import { logger } from '../observability/logger';
import { timerTrigger } from './timerTrigger';

export const index = (context: Context): Promise<void> => nonHttpTriggerContextWrapper(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withEgressFiltering(timerTrigger, ALLOWED_ADDRESSES(), ON_INTERNAL_ACCESS_DENIED_ERROR, logger as any),
  context,
);
