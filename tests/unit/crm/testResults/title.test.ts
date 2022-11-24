import { CrmTitle, crmTitleToTitle, Title } from '../../../../src/crm/testResults/title';

describe('Title', () => {
  describe('crmTitleToTitle', () => {
    test.each([
      [CrmTitle.Mr, Title.Mr],
      [CrmTitle.Miss, Title.Miss],
      [CrmTitle.Mrs, Title.Mrs],
      [CrmTitle.Ms, Title.Ms],
      [CrmTitle.Mx, Title.Mx],
      [CrmTitle.Dr, Title.Dr],
      [undefined, undefined],
    ])('GIVEN crmTitle %s return %s', (crmTitle: CrmTitle | undefined, expectedTitle: Title | undefined) => {
      expect(crmTitleToTitle(crmTitle)).toBe(expectedTitle);
    });
  });
});
