const {beforeEach, describe, expect, it} = require('@jest/globals');
const {readingsOf} = require('./printed-number.js');

describe('readingsOf', () => {
  /** @type {string} */
  let printed;

  beforeEach(() => {
    printed = '1.005,00';
  });

  it('reads a German amount into the notation an answer uses', () => {
    expect(readingsOf(printed)).toEqual(['1005.00']);
  });

  it('reads the English notation of the same amount to the same reading', () => {
    printed = '1,005.00';

    expect(readingsOf(printed)).toEqual(['1005.00']);
  });

  it('groups on a straight apostrophe', () => {
    printed = '12\'345.60';

    expect(readingsOf(printed)).toEqual(['12345.60']);
  });

  it('groups on the typographic apostrophe a PDF more often carries', () => {
    printed = '12\u2019345.60';

    expect(readingsOf(printed)).toEqual(['12345.60']);
  });

  it('groups on a non-breaking space', () => {
    printed = '1\u00A0005,00';

    expect(readingsOf(printed)).toEqual(['1005.00']);
  });

  it('groups on a narrow non-breaking space', () => {
    printed = '1\u202F005,00';

    expect(readingsOf(printed)).toEqual(['1005.00']);
  });

  it('groups on every separator but the last, however many there are', () => {
    printed = '1.005.000,42';

    expect(readingsOf(printed)).toEqual(['1005000.42']);
  });

  it('reads a repeated separator as grouping alone, there being no decimal point among them', () => {
    printed = '1.005.000';

    expect(readingsOf(printed)).toEqual(['1005000']);
  });

  it('keeps every decimal a quantity was executed at (comma)', () => {
    printed = '0,55814';

    expect(readingsOf(printed)).toEqual(['0.55814']);
  });

  it('keeps every decimal a quantity was executed at (dot)', () => {
    printed = '1.23456';

    expect(readingsOf(printed)).toEqual(['1.23456']);
  });

  it('drops a trailing booking sign', () => {
    printed = '2.163,00-';

    expect(readingsOf(printed)).toEqual(['2163.00']);
  });

  it('drops a trailing booking sign', () => {
    printed = '-2163,00';

    expect(readingsOf(printed)).toEqual(['2163.00']);
  });

  it('drops the parentheses a US statement marks a deduction with', () => {
    printed = '(1,234.56)';

    expect(readingsOf(printed)).toEqual(['1234.56']);
  });

  it('keeps a quantity in parentheses to all of its decimals', () => {
    printed = '(0.55814)';

    expect(readingsOf(printed)).toEqual(['0.55814']);
  });

  it('drops leading zeros, which a JSON number may not carry', () => {
    printed = '010';

    expect(readingsOf(printed)).toEqual(['10']);
  });

  it('leaves one digit where every digit is a zero', () => {
    printed = '000000000';

    expect(readingsOf(printed)).toEqual(['0']);
  });

  it('reads a plain integer as itself', () => {
    printed = '10';

    expect(readingsOf(printed)).toEqual(['10']);
  });

  describe('a lone separator with exactly three digits behind it', () => {

    beforeEach(() => {
      printed = '1.005';
    });

    it('offers the grouped reading and the fraction, the grouped one first', () => {
      expect(readingsOf(printed)).toEqual(['1005', '1.005']);
    });

    it('offers the fraction alone behind a zero, where no grouping is possible', () => {
      printed = '0,132';

      expect(readingsOf(printed)).toEqual(['0.132']);
    });
  });

  describe('a word that is no number', () => {

    it('reads a date as none, its groups being no thousands', () => {
      printed = '02.02.2025';

      expect(readingsOf(printed)).toEqual([]);
    });

    it('reads a currency code as none', () => {
      printed = 'EUR';

      expect(readingsOf(printed)).toEqual([]);
    });

    it('reads two figures an ASCII space joined as none, that space grouping nothing', () => {
      printed = '92 017090';

      expect(readingsOf(printed)).toEqual([]);
    });

    it('reads an unbalanced opening bracket as none', () => {
      printed = '(100';

      expect(readingsOf(printed)).toEqual([]);
    });

    it('reads an unbalanced closing bracket as none', () => {
      printed = '100)';

      expect(readingsOf(printed)).toEqual([]);
    });

    it('reads an empty string as none', () => {
      printed = '';

      expect(readingsOf(printed)).toEqual([]);
    });
  });
});
