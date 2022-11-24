export enum TarsExportedStatus {
  PROCESSED = 1,
  FAILED_VALIDATION = 2,
}

export function tarsExportedStatusToString(tarsExportedStatus: TarsExportedStatus): string {
  if (tarsExportedStatus === TarsExportedStatus.PROCESSED) {
    return 'Processed';
  }
  return 'Failed Validation';
}
