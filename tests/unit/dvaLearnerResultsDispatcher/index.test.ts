import { mocked } from 'ts-jest/utils';
import { index } from '../../../src/dvaLearnerResultsDispatcher/index';
import { timerTrigger } from '../../../src/dvaLearnerResultsDispatcher/timerTrigger';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/dvaLearnerResultsDispatcher/timerTrigger');

const mockedTimerTrigger = mocked(timerTrigger);

describe('dvaResultsDispatcher index', () => {
  describe('egressFiltering', describeEgressFiltering(index, mockedTimerTrigger));
});
