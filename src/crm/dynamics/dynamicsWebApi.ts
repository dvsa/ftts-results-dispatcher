import {
  ChainedTokenCredential, ClientSecretCredential, ManagedIdentityCredential, TokenCredential,
} from '@dvsa/ftts-auth-client';
import DynamicsWebApi, { OnTokenAcquiredCallback } from 'dynamics-web-api';
import config from '../../config';
import { logger } from '../../observability/logger';

const getChainedTokenCredential = (): ChainedTokenCredential => {
  const sources: TokenCredential[] = [new ManagedIdentityCredential(config.crm.auth.userAssignedEntityClientId)];
  if (config.crm.auth.tenantId && config.crm.auth.clientId && config.crm.auth.clientSecret) {
    sources.push(new ClientSecretCredential(config.crm.auth.tenantId, config.crm.auth.clientId, config.crm.auth.clientSecret));
  }
  return new ChainedTokenCredential(...sources);
};

export const chainedTokenCredential = getChainedTokenCredential();

export async function onTokenRefresh(dynamicsWebApiCallback: OnTokenAcquiredCallback): Promise<void> {
  try {
    const accessToken = await chainedTokenCredential.getToken(config.crm.auth.scope);
    dynamicsWebApiCallback(accessToken?.token);
  } catch (error) {
    logger.error(error as Error, `dynamicsWebApi::onTokenRefresh: Failed to authenticate with CRM - ${(error as Error)?.message}`);
    // Callback needs to be called - to prevent function from hanging
    dynamicsWebApiCallback('');
  }
}

export function webApiUrl(): string {
  return `${config.crm.apiUrl}/`;
}

export function newDynamicsWebApi(): DynamicsWebApi {
  return new DynamicsWebApi({
    webApiUrl: webApiUrl(),
    onTokenRefresh,
  });
}
