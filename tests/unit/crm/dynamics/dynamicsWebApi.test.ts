import { mocked } from 'ts-jest/utils';
import { AccessToken } from '@azure/identity';
import { mockedConfig } from '../../../mocks/config.mock';
import { tokenCredential, onTokenRefresh, webApiUrl } from '../../../../src/crm/dynamics/dynamicsWebApi';

jest.mock('@azure/identity');

const mockedTokenCredential = mocked(tokenCredential, true);

describe('DynamicsWebApi', () => {
  describe('webApiUrl', () => {
    test('GIVEN config.crm.azureAdUri WHEN called THEN returns a proper url', () => {
      mockedConfig.crm.azureAdUri = 'CRM_AZURE_AD_URI';

      const url = webApiUrl();

      expect(url).toEqual(`${mockedConfig.crm.azureAdUri}/api/data/v9.1/`);
    });
  });

  describe('onTokenRefresh', () => {
    beforeEach(() => {
      mockedConfig.crm.azureAdUri = 'CRM_AZURE_AD_URI';
    });

    test('GIVEN valid credentials WHEN called THEN returns a new token', async () => {
      const expectedAccessToken: AccessToken = {
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs',
        expiresOnTimestamp: 1,
      };
      mockedTokenCredential.getToken.mockResolvedValue(expectedAccessToken);

      let actualToken: string | undefined;
      const callback: (token: string | undefined) => void = (token) => {
        actualToken = token;
      };
      await onTokenRefresh(callback);

      expect(mockedTokenCredential.getToken).toHaveBeenCalledWith(
        `${mockedConfig.crm.azureAdUri}/.default`,
      );
      expect(actualToken).toEqual(expectedAccessToken.token);
    });

    test('GIVEN invalid credentials WHEN called THEN returns undefined', async () => {
      mockedTokenCredential.getToken.mockResolvedValue(null);

      let actualToken: string | undefined;
      const callback: (token: string | undefined) => void = (token) => {
        actualToken = token;
      };
      await onTokenRefresh(callback);

      expect(mockedTokenCredential.getToken).toHaveBeenCalledWith(
        `${mockedConfig.crm.azureAdUri}/.default`,
      );
      expect(actualToken).toEqual(undefined);
    });
  });
});
