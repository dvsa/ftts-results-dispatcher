import { mocked } from 'ts-jest/utils';
import { index } from '../../../src/fileHousekeeping/index';
import { timerTrigger } from '../../../src/fileHousekeeping/timerTrigger';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/fileHousekeeping/timerTrigger');

const mockedTimerTrigger = mocked(timerTrigger);

describe('index', () => {
  describe('egressFiltering', describeEgressFiltering(index, mockedTimerTrigger));
});
