import { mocked } from 'ts-jest/utils';
import { index } from '../../../src/dvaAmiResultsDispatcher/index';
import { timerTrigger } from '../../../src/dvaAmiResultsDispatcher/timerTrigger';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/dvaAmiResultsDispatcher/timerTrigger');

const mockedTimerTrigger = mocked(timerTrigger);

describe('dvaAmiResultsDispatcher index', () => {
  describe('egressFiltering', describeEgressFiltering(index, mockedTimerTrigger));
});
