import { mocked } from 'ts-jest/utils';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { newTarsResultsDispatcher, TarsResultsDispatcher } from '../../../src/tarsResultsDispatcher/tarsResultsDispatcher';
import { timerTrigger } from '../../../src/tarsResultsDispatcher/timerTrigger';
import { mockedContext } from '../../mocks/context.mock';
import handleError from '../../../src/error/handleError';

jest.mock('../../../src/tarsResultsDispatcher/tarsResultsDispatcher');
const mockedNewTarsResultsDispatcher = mocked(newTarsResultsDispatcher);
const mockedTarsResultsDispatcher = mock<TarsResultsDispatcher>();

jest.mock('../../../src/error/handleError');
const mockedHandleError = mocked(handleError);

describe('ResultsDispatcherTimerTrigger', () => {
  beforeEach(() => {
    const exportedStatus = 'something';
    mockedContext.bindingData.tarsResultsDispatcher = exportedStatus;
    when(mockedNewTarsResultsDispatcher).calledWith(exportedStatus).mockReturnValue(mockedTarsResultsDispatcher);
  });
  test('GIVEN request context WHEN invoking function THEN processing test results', async () => {
    await timerTrigger(mockedContext);

    expect(mockedTarsResultsDispatcher.dispatchResults).toHaveBeenCalledTimes(1);
  });

  test('GIVEN request context WHEN processing test results failed THEN handle error', async () => {
    const error = new Error('error msg');
    mockedTarsResultsDispatcher.dispatchResults.mockRejectedValue(error);

    await timerTrigger(mockedContext);

    expect(mockedHandleError).toBeCalledWith(error);
  });
});
