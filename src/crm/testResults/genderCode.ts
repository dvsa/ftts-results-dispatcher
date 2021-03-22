/* eslint-disable no-redeclare */
/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */
export enum GenderCode {
  MALE = 1,
  FEMALE = 2,
  UNKNOWN = 3,
}

export namespace GenderCode {
  // eslint-disable-next-line no-inner-declarations
  export function toString(genderCode?: GenderCode): string | undefined {
    if (genderCode === GenderCode.MALE) {
      return 'Male';
    }
    if (genderCode === GenderCode.FEMALE) {
      return 'Female';
    }
    if (genderCode === GenderCode.UNKNOWN) {
      return 'Unknown';
    }
    return undefined;
  }
}
