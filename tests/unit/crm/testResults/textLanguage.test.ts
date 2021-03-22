import { TextLanguage } from '../../../../src/crm/testResults/textLanguage';

describe('TextLanguage', () => {
  describe('toString', () => {
    test('GIVEN a text language WHEN called THEN the text language\'s string representation is returned', () => {
      expect(TextLanguage.toString(TextLanguage.ENGLISH)).toEqual('English');
      expect(TextLanguage.toString(TextLanguage.WELSH)).toEqual('Cymraeg (Welsh)');
      expect(TextLanguage.toString()).toBeUndefined();
    });
  });
});
