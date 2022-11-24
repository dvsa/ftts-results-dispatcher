// Errors are received untyped so need to use any
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import HttpStatus from 'http-status-codes';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { CrmError } from '../crm/crmError';
import { CustomError } from './customError';

const ERROR_EVENT_MAX_DEEP = 50;

export function handleDvaError(
  error: Error,
  errorEventMaxDeep?: number,
): void {
  logger.error(error);
  if (error instanceof CrmError) {
    handleDvaCrmError(error);
  } else {
    handleErrorWithEvent(error, errorEventMaxDeep || ERROR_EVENT_MAX_DEEP);
  }
  throw error;
}

export default function handleError(
  error: Error,
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
  const cause = error.cause ? error.cause as { status: number } : undefined;
  if (cause?.status) {
    logCrmHttpErrorEvents(cause?.status);
  } else {
    handleErrorWithEvent(error, ERROR_EVENT_MAX_DEEP);
  }
}

function handleDvaCrmError(error: CrmError): void {
  const cause = error.cause ? error.cause as { status : number } : undefined;
  if (cause?.status) {
    logDvaCrmHttpErrorEvents(cause?.status);
  } else {
    handleErrorWithEvent(error, ERROR_EVENT_MAX_DEEP);
  }
}

function logDvaCrmHttpErrorEvents(httpStatus: number): void {
  if (httpStatus === HttpStatus.BAD_REQUEST) {
    logger.event(BusinessTelemetryEvent.RES_DVA_CDS_BAD_REQUEST);
  }
  if (httpStatus === HttpStatus.NOT_FOUND) {
    logger.event(BusinessTelemetryEvent.RES_DVA_CDS_NOT_FOUND);
  }
  if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
    logger.event(BusinessTelemetryEvent.RES_DVA_CDS_INTERNAL_ERROR);
  }
  if ([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(httpStatus)) {
    logger.event(BusinessTelemetryEvent.RES_DVA_CDS_CONNECTIVITY_ISSUE);
  }
}

function logCrmHttpErrorEvents(httpStatus: number): void {
  if (httpStatus === HttpStatus.BAD_REQUEST) {
    logger.event(BusinessTelemetryEvent.RES_TARS_CDS_BAD_REQUEST);
  }
  if (httpStatus === HttpStatus.NOT_FOUND) {
    logger.event(BusinessTelemetryEvent.RES_TARS_CDS_NOT_FOUND);
  }
  if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
    logger.event(BusinessTelemetryEvent.RES_TARS_CDS_INTERNAL_ERROR);
  }
  if ([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(httpStatus)) {
    logger.event(BusinessTelemetryEvent.RES_TARS_CDS_CONNECTIVITY_ISSUE);
  }
}

function handleErrorWithEvent(error: Error, errorEventMaxDeep: number): void {
  const errorEvent = getErrorEvent(error, 0, errorEventMaxDeep);
  if (errorEvent) {
    logger.event(errorEvent);
  }
}

function getErrorEvent(error: Error, deepCount: number, errorEventMaxDeep: number): BusinessTelemetryEvent | undefined {
  if (deepCount > errorEventMaxDeep) {
    return undefined;
  }

  if (error instanceof CustomError) {
    if (error.properties) {
      if (error.properties.event) {
        return error.properties.event as BusinessTelemetryEvent;
      }
    }
    if (error.cause) {
      return getErrorEvent(error.cause, deepCount + 1, errorEventMaxDeep);
    }
  }
  return undefined;
}
