import { addressParser, InternalAccessDeniedError, Address } from '@dvsa/egress-filtering';
import config from '../config';
import { logger, BusinessTelemetryEvent } from '../observability/logger';

export const ALLOWED_ADDRESSES: () => Array<Address> = () => [
  addressParser.parseUri(config.crm.apiUrl),
  ...addressParser.parseConnectionString(config.common.azureBlob.storageConnectionString),
  ...addressParser.parseConnectionString(config.tars.azureFiles.storageConnectionString),
];

export const ON_INTERNAL_ACCESS_DENIED_ERROR = (error: InternalAccessDeniedError): void => {
  logger.event(
    BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
    error.message,
    {
      host: error.host,
      port: error.port,
    },
  );
};
