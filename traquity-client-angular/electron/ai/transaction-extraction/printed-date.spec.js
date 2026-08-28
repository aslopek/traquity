const {beforeEach, describe, expect, it} = require('@jest/globals');
const {datesIn, maskDatesIn} = require('./printed-date.js');

describe('datesIn', () => {
  /** @type {string} */
  let text;

  beforeEach(() => {
    text = 'prefix  |  04.04.2022 | postfix';
  });

  it('reads a dot-separated date as day first', () => {
    expect(datesIn(text)).toEqual(['2022-04-04']);
  });

  it('reads a dot-separated date whose day and month cannot be swapped as day first', () => {
    text = '27.04.2026';

    expect(datesIn(text)).toEqual(['2026-04-27']);
  });

  it('reads an ISO date as itself', () => {
    text = '2024-02-02';

    expect(datesIn(text)).toEqual(['2024-02-02']);
  });

  it('reads a year-first slashed date as itself', () => {
    text = '2024/02/02';

    expect(datesIn(text)).toEqual(['2024-02-02']);
  });

  it('offers both readings of a slashed date whose first two fields could each be the month', () => {
    text = '05/06/2024';

    expect(datesIn(text)).toEqual(['2024-06-05', '2024-05-06']);
  });

  it('offers one reading of a slashed date whose first field is above twelve', () => {
    text = '25/12/2024';

    expect(datesIn(text)).toEqual(['2024-12-25']);
  });

  it('offers one reading of a slashed date whose second field is above twelve', () => {
    text = '12/25/2024';

    expect(datesIn(text)).toEqual(['2024-12-25']);
  });

  it('offers one reading where both orders name the same day', () => {
    text = '06/06/2024';

    expect(datesIn(text)).toEqual(['2024-06-06']);
  });

  it('pads a day and a month the page prints with one digit', () => {
    text = '4.7.2024';

    expect(datesIn(text)).toEqual(['2024-07-04']);
  });

  it('reads the 29th of February in a leap year', () => {
    text = '29.02.2024';

    expect(datesIn(text)).toEqual(['2024-02-29']);
  });

  it('refuses the 29th of February outside a leap year', () => {
    text = '29.02.2023';

    expect(datesIn(text)).toEqual([]);
  });

  it('refuses a day past the end of its month', () => {
    text = '31.04.2024';

    expect(datesIn(text)).toEqual([]);
  });

  it('refuses a month past the end of the year', () => {
    text = '01.13.2024';

    expect(datesIn(text)).toEqual([]);
  });

  it('refuses a two-digit year, which no shape rule settles', () => {
    text = '04.04.22';

    expect(datesIn(text)).toEqual([]);
  });

  it('refuses a word carrying more fields than a date has', () => {
    text = '1.2.3.4';

    expect(datesIn(text)).toEqual([]);
  });

  it('reads a date beside the time on the same stamp', () => {
    text = 'Date and time 27.04.2026 17:14:36';

    expect(datesIn(text)).toEqual(['2026-04-27']);
  });

  it('reads every date a row states', () => {
    text = 'prefix  |  01.01.2025 - 31.12.2025';

    expect(datesIn(text)).toEqual(['2025-01-01', '2025-12-31']);
  });

  it('states a date the page prints twice once', () => {
    text = 'date1  |  04.04.2022  |  date2  |  04.04.2022';

    expect(datesIn(text)).toEqual(['2022-04-04']);
  });

  it('passes over a run of digits and dots longer than a date', () => {
    text = 'Referenz 0883.04281612.0001257';

    expect(datesIn(text)).toEqual([]);
  });

  it('passes over a decimal amount', () => {
    text = 'value  |  1.005,00 EUR';

    expect(datesIn(text)).toEqual([]);
  });
});

describe('maskDatesIn', () => {
  /** @type {string} */
  let text;

  beforeEach(() => {
    text = 'am 04.04.2022 gekauft';
  });

  it('replaces a date with as many spaces', () => {
    expect(maskDatesIn(text)).toBe('am            gekauft');
  });

  it('replaces every date a row states', () => {
    text = 'von 01.01.2025 bis 31.12.2025 gültig';

    expect(maskDatesIn(text)).toBe('von            bis            gültig');
  });

  it('leaves a run of digits and dots longer than a date untouched', () => {
    text = 'Referenz 0883.04281612.0001257';

    expect(maskDatesIn(text)).toBe('Referenz 0883.04281612.0001257');
  });

  it('leaves a text stating no date untouched', () => {
    text = 'value  |  1.005,00 EUR';

    expect(maskDatesIn(text)).toBe('value  |  1.005,00 EUR');
  });
});
