/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable import/export */
/* eslint-disable no-redeclare */
export enum Title {
  Mr = 675030000,
  Ms = 675030001,
  Mx = 675030002,
  Mrs = 675030003,
  Miss = 675030004,
  Dr = 675030005,
}

export namespace Title {
  // eslint-disable-next-line no-inner-declarations
  export function toString(title: Title): string {
    // eslint-disable-next-line security/detect-object-injection
    return Title[title];
  }
}
