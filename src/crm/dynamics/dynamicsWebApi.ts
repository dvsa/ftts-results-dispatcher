import DynamicsWebApi from 'dynamics-web-api';

import {
  TokenCredential,
  ClientSecretCredential,
} from '@azure/identity';

import config from '../../config';

export const tokenCredential: TokenCredential = new ClientSecretCredential(
  config.azureTenantId,
  config.crm.azureClientId,
  config.crm.azureClientSecret,
);

export async function onTokenRefresh(
  dynamicsWebApiCallback: (token: string | undefined) => void,
): Promise<void> {
  const accessToken = await tokenCredential.getToken(
    `${config.crm.azureAdUri}/.default`,
  );
  dynamicsWebApiCallback(accessToken?.token);
}

export function webApiUrl(): string {
  return `${config.crm.azureAdUri}/api/data/v9.1/`;
}

export function newDynamicsWebApi(): DynamicsWebApi {
  return new DynamicsWebApi({
    webApiUrl: webApiUrl(),
    onTokenRefresh,
  });
}
