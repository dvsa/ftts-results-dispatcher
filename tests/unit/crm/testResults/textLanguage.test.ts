import { TextLanguage, textLanguageToString } from '../../../../src/crm/testResults/textLanguage';

describe('TextLanguage', () => {
  describe('toString', () => {
    test('GIVEN a text language WHEN called THEN the text language\'s string representation is returned', () => {
      expect(textLanguageToString(TextLanguage.ENGLISH)).toEqual('English');
      expect(textLanguageToString(TextLanguage.WELSH)).toEqual('Cymraeg (Welsh)');
      expect(textLanguageToString()).toBeUndefined();
    });
  });
});
