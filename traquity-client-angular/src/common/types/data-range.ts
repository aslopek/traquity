import { sub } from 'date-fns';

export type DataRange = '1w' | '1m' | '3m' | '6m' | '1y' | '2y' | '3y' | '5y' | '10y' | 'max' | 'ytd';

export function fromDateRange(dataRange: DataRange): Date {
  if (dataRange === 'max') {
    return new Date(1970, 0, 1);
  }

  const date: Date = new Date();
  if (dataRange === 'ytd') {
    date.setMonth(0);
    date.setDate(1);
    return date;
  } else if (dataRange === '1w') {
    return sub(date, { weeks: 1 });
  } else if (dataRange === '1m') {
    return sub(date, { months: 1 });
  } else if (dataRange === '3m') {
    return sub(date, { months: 3 });
  } else if (dataRange === '6m') {
    return sub(date, { months: 6 });
  } else if (dataRange === '1y') {
    return sub(date, { years: 1 });
  } else if (dataRange === '2y') {
    return sub(date, { years: 2 });
  } else if (dataRange === '3y') {
    return sub(date, { years: 3 });
  } else if (dataRange === '5y') {
    return sub(date, { years: 5 });
  } else {
    return sub(date, { years: 10 });
  }
}