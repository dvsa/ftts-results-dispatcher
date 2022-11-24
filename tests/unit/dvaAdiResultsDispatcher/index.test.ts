import { mocked } from 'ts-jest/utils';
import { index } from '../../../src/dvaAdiResultsDispatcher/index';
import { timerTrigger } from '../../../src/dvaAdiResultsDispatcher/timerTrigger';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/dvaAdiResultsDispatcher/timerTrigger');

const mockedTimerTrigger = mocked(timerTrigger);

describe('dvaAdiResultsDispatcher index', () => {
  describe('egressFiltering', describeEgressFiltering(index, mockedTimerTrigger));
});
