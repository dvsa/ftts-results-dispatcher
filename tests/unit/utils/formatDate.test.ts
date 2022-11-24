import { formatDate, DateFormat } from '../../../src/utils/formatDate';

describe('formatDate', () => {
  test('GIVEN no date WHEN formatDate THEN returns undefined', () => {
    const actualDate = formatDate(undefined, DateFormat.yyyyMMdd);

    expect(actualDate).toBeUndefined();
  });

  test('GIVEN date WHEN formatDate with dd/MM/yyyy format THEN returns formated date', () => {
    const actualDate1 = formatDate(new Date('2020-05-01'), DateFormat['dd/MM/yyyy']);
    const actualDate2 = formatDate(new Date('2020-12-11'), DateFormat['dd/MM/yyyy']);

    expect(actualDate1).toEqual('01/05/2020');
    expect(actualDate2).toEqual('11/12/2020');
  });

  test('GIVEN date WHEN formatDate with yyyyMMdd format THEN returns formated date', () => {
    const actualDate1 = formatDate(new Date('2020-05-01'), DateFormat.yyyyMMdd);
    const actualDate2 = formatDate(new Date('2020-12-11'), DateFormat.yyyyMMdd);

    expect(actualDate1).toEqual('20200501');
    expect(actualDate2).toEqual('20201211');
  });
});
