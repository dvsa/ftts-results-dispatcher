import each from 'jest-each';
import { Address, InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { ALLOWED_ADDRESSES, ON_INTERNAL_ACCESS_DENIED_ERROR } from '../../../src/egress';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/config');
jest.mock('../../../src/observability/logger');

describe('egress', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ALLOWED_ADDRESSES', () => {
    each([
      [
        () => {
          mockedConfig.crm.apiUrl = 'https://fttsshire.crm11.dynamics.com';
          mockedConfig.common.azureBlob.storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=dsuksdvtarsexpsftpfs005;AccountKey=stKxKyEc56Js/LoMmzOTOkZt7XMUzZpATzJQqPFRVBNlFJu+50fUQUDG9tL+VzqNZsn1XvCKqb1WPrSZgEHpng==;EndpointSuffix=core.windows.net';
          mockedConfig.tars.azureFiles.storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=dsuksdvtarsexpsftpfs005;AccountKey=stKxKyEc56Js/LoMmzOTOkZt7XMUzZpATzJQqPFRVBNlFJu+50fUQUDG9tL+VzqNZsn1XvCKqb1WPrSZgEHpng==;EndpointSuffix=core.windows.net';
        },
        [
          {
            host: 'fttsshire.crm11.dynamics.com',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.blob.core.windows.net',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.queue.core.windows.net',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.table.core.windows.net',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.file.core.windows.net',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.blob.core.windows.net',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.queue.core.windows.net',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.table.core.windows.net',
            port: 443,
          },
          {
            host: 'dsuksdvtarsexpsftpfs005.file.core.windows.net',
            port: 443,
          },
        ],
      ],
    ]).test('contain all required addresses as per the config', (givenConfig: () => void, expectedAddresses: Address[]) => {
      givenConfig();
      expect(ALLOWED_ADDRESSES()).toEqual(expectedAddresses);
    });
  });

  describe('ON_INTERNAL_ACCESS_DENIED_ERROR', () => {
    each([
      [
        new InternalAccessDeniedError('localhost', '80', 'Unrecognised address'),
      ],
    ]).test('proper event is logged', (givenError: InternalAccessDeniedError) => {
      ON_INTERNAL_ACCESS_DENIED_ERROR(givenError);

      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
        givenError.message,
        {
          host: givenError.host,
          port: givenError.port,
        },
      );
    });
  });
});
