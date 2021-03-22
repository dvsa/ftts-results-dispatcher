import { mocked } from 'ts-jest/utils';
import { index } from '../../../src/resultsDispatcher/index';
import { timerTrigger } from '../../../src/resultsDispatcher/timerTrigger';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/resultsDispatcher/timerTrigger');

const mockedTimerTrigger = mocked(timerTrigger);

describe('index', () => {
  describe('egressFiltering', describeEgressFiltering(index, mockedTimerTrigger));
});
