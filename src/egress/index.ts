import { addressParser, InternalAccessDeniedError, Address } from '@dvsa/egress-filtering';
import config from '../config';
import { logger, BusinessTelemetryEvent } from '../observability/logger';

export const ALLOWED_ADDRESSES: () => Array<Address> = () => [
  addressParser.parseUri(config.crm.azureAdUri),
  ...addressParser.parseConnectionString(config.azureBlob.storageConnectionString),
  ...addressParser.parseConnectionString(config.azureFiles.storageConnectionString),
];

export const ON_INTERNAL_ACCESS_DENIED_ERROR = (error: InternalAccessDeniedError): void => {
  logger.logEvent(
    BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
    error.message,
    {
      host: error.host,
      port: error.port,
    },
  );
};
