const {beforeEach, describe, expect, it} = require('@jest/globals');
const {extractedAnswerSchema, grammarFor, isinOf, literalsOf, messageFor, transactionOfAnswer} =
  require('./transaction-extraction.js');

/** @import {DocumentLiterals, ExtractedTransaction} from './transaction-extraction.js' */

/**
 * @param {Partial<DocumentLiterals>} [overrides]
 * @returns {DocumentLiterals}
 */
function literalsFactory(overrides = {}) {
  return {
    dates: ['2024-02-02'],
    times: ['14:05:00'],
    numbers: ['1700.00', '10'],
    ...overrides
  };
}

describe('literalsOf', () => {

  /** @type {string} */
  let documentText;

  beforeEach(() => {
    documentText = [
      'Handelstag  |  02.02.2024  |  Handelszeit  |  14:05:00',
      'Stück 10  |  MUSTERWERKE AG  |  DE000MUSTR14  |  (MUSTR1)',
      'Kurswert  |  1.700,00 EUR'
    ].join('\n');
  });

  it('reads what the page prints into the notation an answer uses, no digits of a date, a time or an ISIN among the numbers', () => {
    expect(literalsOf(documentText)).toEqual({
      dates: ['2024-02-02'],
      times: ['14:05:00'],
      numbers: ['10', '1700.00']
    });
  });

  it('offers the trade date beside the letter\'s own, both being dates the page prints', () => {
    documentText = [
      'Frau  |  Datum  |  28.04.2026',
      'Schlusstag/-Zeit 27.04.2026 17:14:36'
    ].join('\n');

    expect(literalsOf(documentText)).toEqual({dates: ['2026-04-28', '2026-04-27'], times: ['17:14:36'], numbers: []});
  });

  it('reads a time stated to a fraction of a second down to the second', () => {
    documentText = 'Auftragszeit:  |  17:28:46:73';

    expect(literalsOf(documentText)).toEqual({dates: [], times: ['17:28:46'], numbers: []});
  });

  it('reads a time stated to the minute as the whole minute', () => {
    documentText = 'Handelszeit  |  : 20:56 Uhr (MEZ/MESZ)';

    expect(literalsOf(documentText)).toEqual({dates: [], times: ['20:56:00'], numbers: []});
  });

  it('states a time once where the page prints two precisions of it', () => {
    documentText = [
      'Auftragszeit:  |  11:57:34:00',
      'Handelsuhrzeit  |  11:57:34'
    ].join('\n');

    expect(literalsOf(documentText)).toEqual({dates: [], times: ['11:57:34'], numbers: []});
  });

  it('reads a quantity to every decimal it was executed at', () => {
    documentText = 'Stück 0,55814  |  MUSTER ETF';

    expect(literalsOf(documentText)).toEqual({dates: [], times: [], numbers: ['0.55814']});
  });

  it('reads an exchange rate to its four decimals', () => {
    documentText = 'Devisenkurs  |  2.4181';

    expect(literalsOf(documentText)).toEqual({dates: [], times: [], numbers: ['2.4181']});
  });

  it('offers both readings of a lone separator with three digits behind it', () => {
    documentText = 'Stück 1.005  |  MUSTER ETF';

    expect(literalsOf(documentText)).toEqual({dates: [], times: [], numbers: ['1005', '1.005']});
  });

  it('leaves the components of a date the page already prints as yyyy-mm-dd out of the numbers', () => {
    documentText = 'Handelstag: 2024-02-02';

    expect(literalsOf(documentText)).toEqual({dates: ['2024-02-02'], times: [], numbers: []});
  });

  it('reports one literal for two notations of one figure, the reading being what it collects', () => {
    documentText = 'Kurswert: 1700.00\nAusführungswert: 1.700,00';

    expect(literalsOf(documentText)).toEqual({dates: [], times: [], numbers: ['1700.00']});
  });

  it('reports nothing for a page that prints nothing it can lift', () => {
    documentText = 'Wertpapier Abrechnung Verkauf';

    expect(literalsOf(documentText)).toEqual({dates: [], times: [], numbers: []});
  });
});

describe('isinOf', () => {

  /** @type {string} */
  let documentText;

  beforeEach(() => {
    documentText = 'Stück 10  |  MUSTERWERKE AG  |  DE000MUSTR14  |  (MUSTR1)';
  });

  it('reads the security the page names', () => {
    expect(isinOf(documentText)).toBe('DE000MUSTR14');
  });

  it('names none where the page prints two securities, neither of them the one it is about', () => {
    documentText = 'DE000MUSTR14  |  MUSTERWERKE AG\nDE000ZWEIT14  |  ZWEITWERK AG';

    expect(isinOf(documentText)).toBeUndefined();
  });

  it('names none where the page prints no ISIN at all', () => {
    documentText = 'Wertpapier Abrechnung Verkauf';

    expect(isinOf(documentText)).toBeUndefined();
  });

  it('states the one the page prints twice once, two mentions being one security', () => {
    documentText = 'ISIN: DE000MUSTR14\nWertpapierkennnummer  |  DE000MUSTR14';

    expect(isinOf(documentText)).toBe('DE000MUSTR14');
  });

  it('passes over an ISIN sitting inside a longer run of letters and digits', () => {
    documentText = 'Referenz  |  XXDE000MUSTR14YY';

    expect(isinOf(documentText)).toBeUndefined();
  });
});

describe('grammarFor', () => {

  /** @type {string} the root rule of a page printing a time, whose object therefore carries the key */
  const rootWithTime = [
    'root ::= "{" ws "\\"transactionType\\":" ws type ws',
    '"," ws "\\"date\\":" ws date ws',
    '( "," ws "\\"time\\":" ws time ws )?',
    '"," ws "\\"securityCountOriginal\\":" ws amount ws',
    '"," ws "\\"grossValue\\":" ws lines ws',
    '"," ws "\\"tax\\":" ws lines ws',
    '"," ws "\\"fee\\":" ws lines ws',
    '"," ws "\\"netProceedings\\":" ws lines ws',
    '"," ws "\\"taxableBase\\":" ws lines ws',
    '"}"'
  ].join(' ');

  /** @type {string} the same rule for a page printing none, the key gone with the rule it decoded through */
  const rootWithoutTime = [
    'root ::= "{" ws "\\"transactionType\\":" ws type ws',
    '"," ws "\\"date\\":" ws date ws',
    '"," ws "\\"securityCountOriginal\\":" ws amount ws',
    '"," ws "\\"grossValue\\":" ws lines ws',
    '"," ws "\\"tax\\":" ws lines ws',
    '"," ws "\\"fee\\":" ws lines ws',
    '"," ws "\\"netProceedings\\":" ws lines ws',
    '"," ws "\\"taxableBase\\":" ws lines ws',
    '"}"'
  ].join(' ');

  /** @type {DocumentLiterals} */
  let literals;

  beforeEach(() => {
    literals = literalsFactory();
  });

  it('constrains every field to what the page prints, one rule to a line', () => {
    expect(grammarFor(literals)).toBe([
      rootWithTime,
      'type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""',
      'date ::= "\\"2024-02-02\\""',
      'time ::= "\\"14:05:00\\""',
      'lines ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"',
      'amount ::= "1700.00" | "10"',
      'number ::= "-"? ( "0" | [1-9] [0-9]{0,15} ) ( "." [0-9]{1,8} )?',
      'ws ::= [ \\t\\r\\n]{0,20}'
    ].join('\n'));
  });

  it('asks for no ISIN, that being read off the page and no answer of the model\'s', () => {
    expect(grammarFor(literals)).not.toContain('isin');
  });

  it('constrains the date to the ones the page prints', () => {
    literals = literalsFactory({dates: ['2024-02-02', '2024-02-05']});

    expect(grammarFor(literals)).toBe([
      rootWithTime,
      'type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""',
      'date ::= "\\"2024-02-02\\"" | "\\"2024-02-05\\""',
      'time ::= "\\"14:05:00\\""',
      'lines ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"',
      'amount ::= "1700.00" | "10"',
      'number ::= "-"? ( "0" | [1-9] [0-9]{0,15} ) ( "." [0-9]{1,8} )?',
      'ws ::= [ \\t\\r\\n]{0,20}'
    ].join('\n'));
  });

  describe('a key the page cannot fill', () => {

    it('is dropped from the object where the page prints no time', () => {
      literals = literalsFactory({times: []});

      expect(grammarFor(literals)).toBe([
        rootWithoutTime,
        'type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""',
        'date ::= "\\"2024-02-02\\""',
        'lines ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"',
        'amount ::= "1700.00" | "10"',
        'number ::= "-"? ( "0" | [1-9] [0-9]{0,15} ) ( "." [0-9]{1,8} )?',
        'ws ::= [ \\t\\r\\n]{0,20}'
      ].join('\n'));
    });
  });

  describe('a required key the page cannot fill', () => {

    it('falls back to the general shape of a date', () => {
      literals = literalsFactory({dates: []});

      expect(grammarFor(literals)).toBe([
        rootWithTime,
        'type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""',
        'date ::= "\\"" [0-9] [0-9] [0-9] [0-9] "-" [0-9] [0-9] "-" [0-9] [0-9] "\\""',
        'time ::= "\\"14:05:00\\""',
        'lines ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"',
        'amount ::= "1700.00" | "10"',
        'number ::= "-"? ( "0" | [1-9] [0-9]{0,15} ) ( "." [0-9]{1,8} )?',
        'ws ::= [ \\t\\r\\n]{0,20}'
      ].join('\n'));
    });

    it('falls back to the general shape of a number', () => {
      literals = literalsFactory({numbers: []});

      expect(grammarFor(literals)).toBe([
        rootWithTime,
        'type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""',
        'date ::= "\\"2024-02-02\\""',
        'time ::= "\\"14:05:00\\""',
        'lines ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"',
        'amount ::= number',
        'number ::= "-"? ( "0" | [1-9] [0-9]{0,15} ) ( "." [0-9]{1,8} )?',
        'ws ::= [ \\t\\r\\n]{0,20}'
      ].join('\n'));
    });
  });
});

describe('messageFor', () => {

  it('states the currency before the page it governs', () => {
    expect(messageFor('Kurswert  |  1.700,00 EUR', 'EUR')).toBe('Currency: `EUR`\n\nKurswert  |  1.700,00 EUR');
  });
});

describe('extractedAnswerSchema', () => {

  /** @type {Record<string, unknown>} */
  let answer;

  beforeEach(() => {
    answer = {
      transactionType: 'SELL',
      date: '2024-02-02',
      time: '14:05:00',
      securityCountOriginal: 10,
      grossValue: [1700],
      tax: [24, 1.32],
      fee: [4.9],
      netProceedings: [1669.78],
      taxableBase: [1700]
    };
  });

  it('accepts an answer carrying every key', () => {
    expect(extractedAnswerSchema.safeParse(answer)).toEqual({success: true, data: answer});
  });

  it('accepts an answer carrying only the required keys', () => {
    answer = {transactionType: 'BUY', date: '2024-02-02', securityCountOriginal: 10, grossValue: [1700], tax: [], fee: [],
      netProceedings: [], taxableBase: []};

    expect(extractedAnswerSchema.safeParse(answer)).toEqual({success: true, data: answer});
  });

  it('refuses a transaction type the app does not have', () => {
    answer = {...answer, transactionType: 'TRANSFER'};

    expect(extractedAnswerSchema.safeParse(answer)).toEqual({
      success: false,
      error: expect.objectContaining({issues: [expect.objectContaining({code: 'invalid_value', path: ['transactionType']})]})
    });
  });

  it('refuses a date in any other notation', () => {
    answer = {...answer, date: '02.02.2024'};

    expect(extractedAnswerSchema.safeParse(answer)).toEqual({
      success: false,
      error: expect.objectContaining({issues: [expect.objectContaining({code: 'invalid_format', path: ['date']})]})
    });
  });

  it('refuses an ISIN, which is read off the page and is no key of an answer', () => {
    answer = {...answer, isin: 'DE000MUSTR14'};

    expect(extractedAnswerSchema.safeParse(answer)).toEqual({
      success: false,
      error: expect.objectContaining({issues: [expect.objectContaining({code: 'unrecognized_keys', keys: ['isin']})]})
    });
  });

  it('refuses a quantity of zero, which no transaction has', () => {
    answer = {...answer, securityCountOriginal: 0};

    expect(extractedAnswerSchema.safeParse(answer)).toEqual({
      success: false,
      error: expect.objectContaining({issues: [expect.objectContaining({code: 'too_small', path: ['securityCountOriginal']})]})
    });
  });

  it('refuses a key the app has no field for', () => {
    answer = {...answer, currency: 'EUR'};

    expect(extractedAnswerSchema.safeParse(answer)).toEqual({
      success: false,
      error: expect.objectContaining({issues: [expect.objectContaining({code: 'unrecognized_keys', keys: ['currency']})]})
    });
  });
});

describe('transactionOfAnswer', () => {

  const ISIN = 'DE000MUSTR14';

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
    answer = {
      transactionType: 'SELL',
      date: '2024-02-02',
      time: '14:05:00',
      securityCountOriginal: 10,
      grossValue: [1700],
      tax: [24, 1.32],
      fee: [4.9],
      netProceedings: [],
      taxableBase: []
    };
  });

  it('adds each monetary list up, and states the ISIN it was given beside them', () => {
    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02', time: '14:05:00',
      isin: ISIN, securityCountOriginal: 10, grossValue: 1700, tax: 25.32, fee: 4.9
    });
  });

  it('leaves the ISIN out entirely where the page names no single security', () => {
    expect(transactionOfAnswer(answer, undefined)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02',
      time: '14:05:00', securityCountOriginal: 10, grossValue: 1700, tax: 25.32, fee: 4.9
    });
  });

  it('adds the lines of a withholding block without the drift binary floating point gives them', () => {
    answer = {...answer, tax: [138.88, 7.63, 12.49]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02', time: '14:05:00',
      isin: ISIN, securityCountOriginal: 10, grossValue: 1700, tax: 159, fee: 4.9
    });
  });

  it('adds amounts of differing precision to the finest of them', () => {
    answer = {...answer, grossValue: [0.1, 0.2, 1.005]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02', time: '14:05:00',
      isin: ISIN, securityCountOriginal: 10, grossValue: 1.305, tax: 25.32, fee: 4.9
    });
  });

  it('leaves tax out entirely where the page prints no tax line', () => {
    answer = {...answer, tax: []};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02', time: '14:05:00',
      isin: ISIN, securityCountOriginal: 10, grossValue: 1700, fee: 4.9
    });
  });

  it('leaves fee out entirely where the page prints no fee line', () => {
    answer = {...answer, fee: []};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02', time: '14:05:00',
      isin: ISIN, securityCountOriginal: 10, grossValue: 1700, tax: 25.32
    });
  });

  it('keeps a stated zero, which is a line the page printed', () => {
    answer = {...answer, tax: [0]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02', time: '14:05:00',
      isin: ISIN, securityCountOriginal: 10, grossValue: 1700, tax: 0, fee: 4.9
    });
  });

  it('adds one gross line to itself, so a single amount survives the summing unchanged', () => {
    answer = {...answer, grossValue: [1582.5]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-02-02', time: '14:05:00',
      isin: ISIN, securityCountOriginal: 10, grossValue: 1582.5, tax: 25.32, fee: 4.9
    });
  });
});

describe('transactionOfAnswer, reconciling against the settlement total', () => {

  const ISIN = 'US8835561023';

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
    // a payment whose lines account for the whole of it: gross 3.83 less a withholding of 0.58 credits 3.25
    answer = {
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: [3.83],
      tax: [0.58],
      fee: [],
      netProceedings: [3.25],
      taxableBase: []
    };
  });

  it('changes nothing where the lines already account for what was credited', () => {
    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 3.83, tax: 0.58
    });
  });

  it('takes the gap as a withholding the page never printed a line for', () => {
    answer = {...answer, tax: []};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 3.83, tax: 0.58
    });
  });

  it('adds that gap to the lines the page did print', () => {
    answer = {...answer, grossValue: [46.83], tax: [5.25], netProceedings: [34.55]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 46.83, tax: 12.28
    });
  });

  it('accounts for a charge in the other direction, a purchase settling above its gross', () => {
    answer = {...answer, transactionType: 'BUY', grossValue: [1405], tax: [], netProceedings: [1417.4]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'BUY', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 1405, tax: 12.4
    });
  });

  it('infers nothing where the page states no settlement total', () => {
    answer = {...answer, tax: [], netProceedings: []};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 3.83
    });
  });

  it('infers nothing on a tax notice, whose gross is the charge and settles at itself', () => {
    answer = {...answer, transactionType: 'TAX', tax: [], netProceedings: [3.25]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'TAX', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 3.83
    });
  });

  it('infers nothing from a total above the gross, which no withholding can produce', () => {
    answer = {...answer, tax: [], netProceedings: [9.31]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 3.83
    });
  });

  it('infers nothing from a gap wider than the gross, which is a misread and not a deduction', () => {
    answer = {...answer, transactionType: 'BUY', tax: [], grossValue: [100], netProceedings: [500]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'BUY', date: '2022-07-15', isin: ISIN,
      securityCountOriginal: 13, grossValue: 100
    });
  });
});

describe('transactionOfAnswer, correcting the gross from what the page taxed', () => {

  const ISIN = 'US5021751020';

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
    // the payment is stated only as the base it was taxed on and the amount that reached the account
    answer = {
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: [8.94],
      tax: [0],
      fee: [],
      netProceedings: [8.94],
      taxableBase: [10.52]
    };
  });

  it('raises the gross to the base, and the credited amount then yields the withholding', () => {
    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 10.52, tax: 1.58
    });
  });

  it('leaves a gross alone where a partial exemption made the base a fraction of it', () => {
    answer = {...answer, grossValue: [11.56], taxableBase: [8.09], netProceedings: [9.31], tax: [2.25]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 11.56, tax: 2.25
    });
  });

  it('leaves the gross alone where the page taxed the very figure it states as the gross', () => {
    answer = {...answer, taxableBase: [8.94]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 8.94, tax: 0
    });
  });

  it('leaves the gross alone where the base sits one cent above it, that being a rounding and no deduction', () => {
    answer = {...answer, taxableBase: [8.95]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 8.94, tax: 0
    });
  });

  it('raises the gross to a base two cents above it, the rounding being all the tolerance covers', () => {
    answer = {...answer, taxableBase: [8.96]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 8.96, tax: 0.02
    });
  });

  it('leaves the gross alone on a tax notice, whose base is what the charge was computed from', () => {
    answer = {...answer, transactionType: 'TAX', grossValue: [7.1], taxableBase: [25.38], netProceedings: [7.1], tax: []};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'TAX', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 7.1
    });
  });

  it('leaves the gross alone where the page states no taxable base', () => {
    answer = {...answer, taxableBase: []};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 8.94, tax: 0
    });
  });

  it('leaves the gross alone where the answer states two bases, neither of them singled out', () => {
    answer = {...answer, taxableBase: [10.52, 8.09]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-05-05', isin: ISIN,
      securityCountOriginal: 65, grossValue: 8.94, tax: 0
    });
  });
});

describe('transactionOfAnswer, a distribution paid out of the contribution account', () => {

  const ISIN = 'DE000MUSTR14';

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
    // German § 27 KStG: the payment is untaxed when made, and reduces the acquisition cost instead
    answer = {
      transactionType: 'DIVIDEND',
      date: '2024-05-16',
      securityCountOriginal: 100,
      grossValue: [42],
      tax: [],
      fee: [],
      netProceedings: [42],
      taxableBase: []
    };
  });

  it('states the payment with no tax, the settlement matching the gross exactly', () => {
    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2024-05-16', isin: ISIN,
      securityCountOriginal: 100, grossValue: 42
    });
  });

  it('infers no tax from a page stating the untaxed nature of the payment as a zero base', () => {
    answer = {...answer, taxableBase: [0]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2024-05-16', isin: ISIN,
      securityCountOriginal: 100, grossValue: 42
    });
  });

  it('leaves the sale that later carries the deferred tax alone, its base exceeding its gross', () => {
    // the acquisition cost was reduced by the payments above, so the gain taxed on disposal is larger than usual -
    // and on a sale the base is a gain and never the gross, whichever of the two is larger
    answer = {
      ...answer,
      transactionType: 'SELL',
      grossValue: [1000],
      tax: [264.5],
      netProceedings: [735.5],
      taxableBase: [1042]
    };

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'SELL', date: '2024-05-16', isin: ISIN,
      securityCountOriginal: 100, grossValue: 1000, tax: 264.5
    });
  });
});

describe('transactionOfAnswer, dropping a line the settlement total disowns', () => {

  const ISIN = 'US4781601046';

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
    // 28.95 less 4.34 + 2.83 + 0.15 + 0.25 credits 21.38; the 17.36 is an offset against tax paid abroad and
    // moves no money, so a list that swept it in overshoots the total the page settles at
    answer = {
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: [28.95],
      tax: [4.34, 17.36, 2.83, 0.15, 0.25],
      fee: [],
      netProceedings: [21.38],
      taxableBase: [11.59]
    };
  });

  it('drops the one line whose removal makes the page\'s own total hold', () => {
    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-06-09', isin: ISIN,
      securityCountOriginal: 25, grossValue: 28.95, tax: 7.57
    });
  });

  it('drops it out of the fee list where that is the list holding it', () => {
    answer = {...answer, tax: [4.34, 2.83, 0.15, 0.25], fee: [17.36]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-06-09', isin: ISIN,
      securityCountOriginal: 25, grossValue: 28.95, tax: 7.57
    });
  });

  it('leaves an answer alone where no single line accounts for the overshoot', () => {
    answer = {...answer, tax: [4.34, 10, 7.36, 2.83, 0.15, 0.25]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-06-09', isin: ISIN,
      securityCountOriginal: 25, grossValue: 28.95, tax: 24.93
    });
  });

  it('leaves an answer alone where two lines each account for it', () => {
    answer = {...answer, grossValue: [28.95], tax: [8.68, 8.68, 4.02], netProceedings: [12.59]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-06-09', isin: ISIN,
      securityCountOriginal: 25, grossValue: 28.95, tax: 21.38
    });
  });

  it('changes nothing where the lines already come to the settled total', () => {
    answer = {...answer, tax: [4.34, 2.83, 0.15, 0.25]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'DIVIDEND', date: '2026-06-09', isin: ISIN,
      securityCountOriginal: 25, grossValue: 28.95, tax: 7.57
    });
  });

  it('drops nothing on a tax notice, whose gross is the charge and settles at itself', () => {
    answer = {...answer, transactionType: 'TAX', tax: [4.34, 17.36], netProceedings: [28.95]};

    expect(transactionOfAnswer(answer, ISIN)).toStrictEqual({
      transactionType: 'TAX', date: '2026-06-09', isin: ISIN,
      securityCountOriginal: 25, grossValue: 28.95, tax: 21.7
    });
  });
});
