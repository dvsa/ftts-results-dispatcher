import * as cleanTextUtils from 'clean-text-utils';

/**
 * Trim string, replace diacritics/special characters and strip any remaining non-ASCII characters.
 */
export const cleanString = (input: string): string => {
  let cleanedString = input.trim();
  cleanedString = cleanTextUtils.replace.exoticChars(cleanedString);
  cleanedString = cleanTextUtils.strip.nonASCII(cleanedString);
  return cleanedString;
};

/**
 * Strips punctuation incl quotes in addition to removing non ASCII chars and return the string converted to lowercase.
 * Also removes characters such as &. Useful for comparison of strings where the content is more important than a strict match.
 * @returns A lowercase string without punctuation and special characters such as &
 */
export const cleanAndRemovePunctuation = (input: string): string => {
  let stringWithoutQuotations = input
    .replace(/["']/g, '')
    .trim();

  stringWithoutQuotations = cleanTextUtils.strip.punctuation(cleanTextUtils.strip.nonASCII(stringWithoutQuotations));
  return stringWithoutQuotations.toLowerCase();
};

/**
 * Convert integer/string to string padded with leading 0s.
 */
export const zeroFill = (value: number | string, totalWidth: number): string => String(value).padStart(totalWidth, '0');
