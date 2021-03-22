import { mocked } from 'ts-jest/utils';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { newResultsDispatcher, ResultsDispatcher } from '../../../src/resultsDispatcher/resultsDispatcher';
import { timerTrigger } from '../../../src/resultsDispatcher/timerTrigger';
import { mockedContext } from '../../mocks/context.mock';
import handleError from '../../../src/error/handleError';

jest.mock('../../../src/resultsDispatcher/resultsDispatcher');
const mockedNewResultsDispatcher = mocked(newResultsDispatcher);
const mockedResultsDispatcher = mock<ResultsDispatcher>();

jest.mock('../../../src/error/handleError');
const mockedHandleError = mocked(handleError);

describe('ResultsDispatcherTimerTrigger', () => {
  beforeEach(() => {
    when(mockedNewResultsDispatcher).calledWith().mockReturnValue(mockedResultsDispatcher);
  });
  test('GIVEN request context WHEN invoking function THEN processing test results', async () => {
    await timerTrigger(mockedContext);

    expect(mockedResultsDispatcher.dispatchResults).toHaveBeenCalledTimes(1);
  });

  test('GIVEN request context WHEN processing test results failed THEN handle error', async () => {
    const error = new Error('error msg');
    mockedResultsDispatcher.dispatchResults.mockRejectedValue(error);

    await timerTrigger(mockedContext);

    expect(mockedHandleError).toBeCalledWith(error);
  });
});
