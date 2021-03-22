/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import HttpStatus from 'http-status-codes';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { CrmError } from '../crm/crmError';

const ERROR_EVENT_MAX_DEEP = 50;

export default function handleError(
  error: any,
  errorEventMaxDeep?: number,
): void {
  logger.error(error);
  if (error instanceof CrmError) {
    handleCrmError(error);
  } else {
    handleErrorWithEvent(error, errorEventMaxDeep || ERROR_EVENT_MAX_DEEP);
  }
  throw error;
}

function handleCrmError(error: CrmError): void {
  let httpStatus;
  try {
    httpStatus = error.cause.status;
  } catch (err) { }
  if (httpStatus) {
    logCrmHttpErrorEvents(httpStatus);
  } else {
    handleErrorWithEvent(error, ERROR_EVENT_MAX_DEEP);
  }
}

function logCrmHttpErrorEvents(httpStatus: number): void {
  if (httpStatus === HttpStatus.BAD_REQUEST) {
    logger.logEvent(BusinessTelemetryEvent.RES_TARS_CDS_BAD_REQUEST);
  }
  if (httpStatus === HttpStatus.NOT_FOUND) {
    logger.logEvent(BusinessTelemetryEvent.RES_TARS_CDS_NOT_FOUND);
  }
  if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
    logger.logEvent(BusinessTelemetryEvent.RES_TARS_CDS_INTERNAL_ERROR);
  }
  if ([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(httpStatus)) {
    logger.logEvent(BusinessTelemetryEvent.RES_TARS_CDS_CONNECTIVITY_ISSUE);
  }
}

function handleErrorWithEvent(error: any, errorEventMaxDeep: number): void {
  const errorEvent = getErrorEvent(error, 0, errorEventMaxDeep);
  if (errorEvent) {
    logger.logEvent(errorEvent as BusinessTelemetryEvent);
  }
}

function getErrorEvent(error: any, deepCount: number, errorEventMaxDeep: number): any | undefined {
  if (deepCount > errorEventMaxDeep) {
    return undefined;
  }
  if (error.properties) {
    if (error.properties.event) {
      return error.properties.event;
    }
  }
  if (error.cause) {
    return getErrorEvent(error.cause, deepCount + 1, errorEventMaxDeep);
  }
  return undefined;
}
