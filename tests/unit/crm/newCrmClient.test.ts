/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mocked } from 'ts-jest/utils';
import { proxifyWithRetryPolicy } from '@dvsa/cds-retry';
import { newCrmClient } from '../../../src/crm/crmClient';

jest.mock('@dvsa/cds-retry');
const mockedProxifyWithRetryPolicy = mocked(proxifyWithRetryPolicy, true);

describe('newCrmClient', () => {
  test('WHEN newCrmClient THEN proxifyWithRetryPolicy is called with correct retry policy', () => {
    newCrmClient('Unprocessed');

    expect(mockedProxifyWithRetryPolicy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        retries: 10,
        backoff: 300,
        exponentialFactor: 1.2,
      },
    );
  });
});
