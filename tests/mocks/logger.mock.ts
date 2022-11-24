import { mocked } from 'ts-jest/utils';
import { logger } from '../../src/observability/logger';

export const mockedLogger = mocked(logger, true);
