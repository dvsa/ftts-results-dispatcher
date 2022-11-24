export enum TextLanguage {
  ENGLISH = 1,
  WELSH = 2,
}

export function textLanguageToString(textLanguage?: TextLanguage): string | undefined {
  if (textLanguage === TextLanguage.ENGLISH) {
    return 'English';
  }
  if (textLanguage === TextLanguage.WELSH) {
    return 'Cymraeg (Welsh)';
  }
  return undefined;
}
