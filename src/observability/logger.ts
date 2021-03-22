import { Logger as AzureLogger } from '@dvsa/azure-logger';
import { Props } from '@dvsa/azure-logger/dist/ILogger';
import config from '../config';

export class Logger extends AzureLogger {
  constructor() {
    super('FTTS', config.appName);
  }

  logEvent(
    telemetryEvent: BusinessTelemetryEvent,
    message?: string,
    properties?: Props,
  ): void {
    super.event(
      telemetryEvent,
      message,
      {
        ...properties,
      },
    );
  }
}

export enum BusinessTelemetryEvent {
  RES_TARS_RESULTS_FILE_FETCH_ERROR = 'RES_TARS_RESULTS_FILE_FETCH_ERROR',
  RES_TARS_RESULTS_FILE_STORE_ERROR = 'RES_TARS_RESULTS_FILE_STORE_ERROR',
  RES_TARS_RESULTS_FILE_GENERATION_ERROR = 'RES_TARS_RESULTS_FILE_GENERATION_ERROR',
  RES_TARS_RESULTS_FILE_UPLOAD_SUCCESSFUL = 'RES_TARS_RESULTS_FILE_UPLOAD_SUCCESSFUL',
  RES_TARS_METADATA_FETCH_ERROR = 'RES_TARS_METADATA_FETCH_ERROR',
  RES_TARS_METADATA_STORE_ERROR = 'RES_TARS_METADATA_STORE_ERROR',
  RES_TARS_NO_METADATA_ERROR = 'RES_TARS_NO_METADATA_ERROR',
  RES_TARS_CDS_BAD_REQUEST = 'RES_TARS_CDS_BAD_REQUEST',
  RES_TARS_CDS_CONNECTIVITY_ISSUE = 'RES_TARS_CDS_CONNECTIVITY_ISSUE',
  RES_TARS_CDS_NOT_FOUND = 'RES_TARS_CDS_NOT_FOUND',
  RES_TARS_CDS_INTERNAL_ERROR = 'RES_TARS_CDS_INTERNAL_ERROR',
  RES_TARS_RESULTS_FILES_DELETED = 'RES_TARS_RESULTS_FILES_DELETED',
  NOT_WHITELISTED_URL_CALL = 'NOT_WHITELISTED_URL_CALL',
  HEALTH_CHECK_SUCCESS = 'HEALTH_CHECK_SUCCESS',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
}

export const logger = new Logger();
