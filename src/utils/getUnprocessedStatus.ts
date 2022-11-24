import config from '../config';

export const getUnprocessedStatus = (statusFromContext?: string): string => (statusFromContext || config.common.exportedStatus);
