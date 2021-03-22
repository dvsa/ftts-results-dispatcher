import { mock } from 'jest-mock-extended';
import { mocked } from 'ts-jest/utils';
import { newDynamicsWebApi } from '../../../../src/crm/dynamics/dynamicsWebApi';
import { proxifyExecuteBatchWithCatchAndRethrow } from '../../../../src/crm/dynamics/proxifyExecuteBatchWithCatchAndRethrow';

jest.mock('../../../../src/crm/dynamics/dynamicsWebApi');
const mockedDynamicsWebApi = mock<DynamicsWebApi>();
const mockedNewDynamicsWebApi = mocked(newDynamicsWebApi, true);
mockedNewDynamicsWebApi.mockReturnValue(mockedDynamicsWebApi);

const code = '0x0';
const message = 'a message';

describe('proxifyExecuteBatchWithCatchAndRethrow', () => {
  const expectedError = new Error();
  (expectedError as any).error = {
    code,
    message,
  };

  const dynamicsWebApi = mockedNewDynamicsWebApi();
  proxifyExecuteBatchWithCatchAndRethrow(dynamicsWebApi);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GIVEN proxified dynamicsWebApi WHEN called THEN executeBatch rejects with an error and not an array of errors', async () => {
    mockedDynamicsWebApi.executeBatch.mockRejectedValue(
      [
        {},
        expectedError,
      ],
    );

    await expect(
      dynamicsWebApi.executeBatch(),
    ).rejects.toEqual(expectedError);
    expect((expectedError as any).code).toEqual(code);
    expect((expectedError as any).message).toEqual(message);
    expect((expectedError as any).failedAt).toEqual(1);
  });

  test('GIVEN responses with no Error instance WHEN called THEN executeBatch rejects with the proper error', async () => {
    mockedDynamicsWebApi.executeBatch.mockRejectedValue(
      [
        {
          message: 'msg',
        },
        {},
      ],
    );

    await expect(
      dynamicsWebApi.executeBatch(),
    ).rejects.toEqual(new Error('Caught responses contain no Error instance: [{"message":"msg"},{}]'));
  });
});
