import * as cleanTextUtils from 'clean-text-utils';

export const cleanString = (input: string): string => {
  let cleanedString = input.trim();
  cleanedString = cleanTextUtils.replace.exoticChars(cleanedString);
  cleanedString = cleanTextUtils.strip.nonASCII(cleanedString);
  return cleanedString;
};
