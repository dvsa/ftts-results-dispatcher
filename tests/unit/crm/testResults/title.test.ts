import { Title } from '../../../../src/crm/testResults/title';

describe('Title', () => {
  describe('toString', () => {
    test('GIVEN a title WHEN called THEN the title\'s string representation is returned', () => {
      expect(Title.toString(Title.Mr)).toEqual('Mr');
      expect(Title.toString(Title.Ms)).toEqual('Ms');
      expect(Title.toString(Title.Mx)).toEqual('Mx');
      expect(Title.toString(Title.Mrs)).toEqual('Mrs');
      expect(Title.toString(Title.Miss)).toEqual('Miss');
      expect(Title.toString(Title.Dr)).toEqual('Dr');
    });
  });
});
