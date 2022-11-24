import { cleanAndRemovePunctuation, cleanString, zeroFill } from '../../../src/utils/string';

describe('string utils', () => {
  describe('cleanString', () => {
    test.each([
      ['Iлｔèｒｎåｔïｏｎɑｌíƶａｔï߀ԉ', 'Internationalizati0n'],
      ['meine Straße', 'meine Strasse'],
      ['emoj💪i re✂️moved💩', 'emoji removed'],
      [' spaces trimmed  ', 'spaces trimmed'],
      ['hyphen-not-removed', 'hyphen-not-removed'],
      ['apostroph\'e not removed', 'apostroph\'e not removed'],
      ['‘special quote marks converted’', '\'special quote marks converted\''],
      ['any other non-ASCII chars removed भारत!', 'any other non-ASCII chars removed !'],
    ])('GIVEN input string \'%s\' WHEN function called THEN returns cleaned string \'%s\'',
      (input, expectedOutput) => expect(cleanString(input)).toBe(expectedOutput));
  });

  describe('zeroFill', () => {
    test('GIVEN input integer and width WHEN function called THEN returns zero-padded string of length given width', () => {
      const result = zeroFill(534, 10);
      expect(result).toBe('0000000534');
    });

    test('GIVEN input integer and a width less than the width of the input WHEN function called THEN returns the input integer in it\'s original form', () => {
      const result = zeroFill(534, 2);
      expect(result).toBe('534');
    });
  });

  describe('cleanAndRemovePunctuation', () => {
    test.each([
      ['   Road Procedure & Rider Safety  ', 'road procedure rider safety'],
      ['Traffic Signs and Signals, bike  Control, Pedestrians, Mechanical Knowledge', 'traffic signs and signals bike control pedestrians mechanical knowledge'],
      ['Driving Test,   disabilities, The Law &   the Environment   ', 'driving test disabilities the law the environment'],
      ['  publications,  Instructional Techniques', 'publications instructional techniques'],
      ['"Publications, Instructional Techniques",', 'publications instructional techniques'],
    ])('GIVEN input string with punctuation/extra whitespaces/special chars THEN those are removed and string is returned in lowercase', (input, expectedOutput) => {
      expect(cleanAndRemovePunctuation(input)).toBe(expectedOutput);
    });
  });
});
