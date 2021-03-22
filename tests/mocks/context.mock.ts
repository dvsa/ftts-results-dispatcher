import { Context, Logger } from '@azure/functions';
import { logger } from '../../src/observability/logger';

export const mockedContext: Context = {
  invocationId: '',
  executionContext: {
    invocationId: '',
    functionName: '',
    functionDirectory: '',
  },
  bindings: {},
  bindingData: {},
  traceContext: {
    traceparent: null,
    tracestate: null,
    attributes: {},
  },
  bindingDefinitions: [],
  log: logger as unknown as Logger,
  done: (err?: Error | string | null): void => console.log(err),
};
