import { mocked } from 'ts-jest/utils';
import { index } from '../../../src/tarsResultsDispatcher/index';
import { timerTrigger } from '../../../src/tarsResultsDispatcher/timerTrigger';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/tarsResultsDispatcher/timerTrigger');

const mockedTimerTrigger = mocked(timerTrigger);

describe('index', () => {
  describe('egressFiltering', describeEgressFiltering(index, mockedTimerTrigger));
});
