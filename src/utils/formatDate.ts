import dateformat from 'dateformat';

export enum DateFormat {
  'dd/MM/yyyy',
  yyyyMMdd
}

export function formatDate(date: Date | undefined, format: DateFormat): string | undefined {
  if (date) {
    dateformat.masks.yyyyMMdd = 'yyyymmdd';
    dateformat.masks['dd/MM/yyyy'] = 'dd/mm/yyyy';
    if (format === DateFormat['dd/MM/yyyy']) {
      return dateformat(date, 'dd/MM/yyyy');
    }
    return dateformat(date, 'yyyyMMdd');
  }
  return undefined;
}
