/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable import/export */
/* eslint-disable no-redeclare */
export enum TarsExportedStatus {
  PROCESSED = 1,
  FAILED_VALIDATION = 2,
}

export namespace TarsExportedStatus {
  // eslint-disable-next-line no-inner-declarations
  export function toString(tarsExportedStatus: TarsExportedStatus): string {
    if (tarsExportedStatus === TarsExportedStatus.PROCESSED) {
      return 'Processed';
    }
    return 'Failed Validation';
  }
}
