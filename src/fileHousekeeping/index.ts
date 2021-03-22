import { Context } from '@azure/functions';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { withEgressFiltering } from '@dvsa/egress-filtering';
import { ALLOWED_ADDRESSES, ON_INTERNAL_ACCESS_DENIED_ERROR } from '../egress';
import { timerTrigger } from './timerTrigger';

export const index = (context: Context): Promise<void> => nonHttpTriggerContextWrapper(
  withEgressFiltering(timerTrigger, ALLOWED_ADDRESSES(), ON_INTERNAL_ACCESS_DENIED_ERROR),
  context,
);
