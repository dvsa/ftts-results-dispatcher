/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable import/export */
/* eslint-disable no-redeclare */
export enum TextLanguage {
  ENGLISH = 1,
  WELSH = 2,
}

export namespace TextLanguage {
  // eslint-disable-next-line no-inner-declarations
  export function toString(textLanguage?: TextLanguage): string | undefined {
    if (textLanguage === TextLanguage.ENGLISH) {
      return 'English';
    }
    if (textLanguage === TextLanguage.WELSH) {
      return 'Cymraeg (Welsh)';
    }
    return undefined;
  }
}
