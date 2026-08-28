const {beforeEach, describe, expect, it} = require('@jest/globals');
const {extractedAnswerSchema, grammarFor, messageFor, transactionOfAnswer} =
  require('./transaction-extraction.js');

/** @import {ExtractedTransaction} from './transaction-extraction.js' */

/** @import {DocumentLiterals} from '../../ipc/ipc-schema.js' */

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
    it('drops time from the object where the page prints no time', () => {
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

  it('refuses a quantity of zero, which no transaction has', () => {
    answer = {...answer, securityCountOriginal: 0};

    expect(extractedAnswerSchema.safeParse(answer).success).toBe(false);
  });

  it('refuses an answer stating no gross line, a transaction without one being no transaction', () => {
    answer = {...answer, grossValue: []};

    expect(extractedAnswerSchema.safeParse(answer).success).toBe(false);
  });

  it('refuses an ISIN, which is read off the page and is no key of an answer', () => {
    answer = {...answer, isin: 'DE000MUSTR14'};

    expect(extractedAnswerSchema.safeParse(answer).success).toBe(false);
  });
});

describe('transactionOfAnswer', () => {

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

  it('adds each monetary list up', () => {
    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      time: '14:05:00',
      securityCountOriginal: 10,
      grossValue: 1700,
      tax: 25.32,
      fee: 4.9
    });
  });

  it('adds amounts of differing precision to the finest of them', () => {
    answer = {...answer, grossValue: [0.1, 0.2, 1.005]};

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      time: '14:05:00',
      securityCountOriginal: 10,
      grossValue: 1.305,
      tax: 25.32,
      fee: 4.9
    });
  });

  it('leaves tax out entirely where the page prints no tax line', () => {
    answer = {...answer, tax: []};

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      time: '14:05:00',
      securityCountOriginal: 10,
      grossValue: 1700,
      fee: 4.9
    });
  });

  it('leaves fee out entirely where the page prints no fee line', () => {
    answer = {...answer, fee: []};

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      time: '14:05:00',
      securityCountOriginal: 10,
      grossValue: 1700,
      tax: 25.32
    });
  });

  it('keeps a stated zero, which is a line the page printed', () => {
    answer = {...answer, tax: [0]};

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      time: '14:05:00',
      securityCountOriginal: 10,
      grossValue: 1700,
      tax: 0,
      fee: 4.9
    });
  });
});

describe('transactionOfAnswer, reconciling against the settlement total', () => {

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
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
    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 3.83,
      tax: 0.58
    });
  });

  it('takes the gap as a withholding the page never printed a line for', () => {
    answer = {...answer, tax: []};

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 3.83,
      tax: 0.58
    });
  });

  it('adds that gap to the lines the page did print', () => {
    answer = {
      ...answer,
      grossValue: [46.83],
      tax: [5.25],
      netProceedings: [34.55]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 46.83,
      tax: 12.28 // includes 7.03 unprinted withholding
    });
  });

  it('takes a printed fee into the total it reconciles, and adds the gap that leaves to the tax', () => {
    answer = {
      ...answer,
      grossValue: [46.83],
      tax: [5.25],
      fee: [2.1],
      netProceedings: [34.55]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 46.83,
      tax: 10.18, // includes 4.93 unprinted withholding
      fee: 2.1
    });
  });

  it('accounts for a charge in the other direction, a purchase settling above its gross', () => {
    answer = {
      ...answer,
      transactionType: 'BUY',
      grossValue: [1405],
      tax: [],
      netProceedings: [1417.4]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'BUY',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 1405,
      tax: 12.4
    });
  });

  it('infers nothing where the page states no settlement total', () => {
    answer = {
      ...answer,
      tax: [],
      netProceedings: []
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 3.83
    });
  });

  it('infers nothing on a tax notice, whose gross is the charge and settles at itself', () => {
    answer = {
      ...answer,
      transactionType: 'TAX',
      tax: [],
      netProceedings: [3.25]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'TAX',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 3.83
    });
  });

  it('infers nothing from a total above the gross, which no withholding can produce', () => {
    answer = {
      ...answer,
      tax: [],
      netProceedings: [9.31]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 3.83
    });
  });

  it('infers nothing from a gap wider than the gross, which is a misread and not a deduction', () => {
    answer = {
      ...answer,
      transactionType: 'BUY',
      tax: [],
      grossValue: [100],
      netProceedings: [500]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'BUY',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 100
    });
  });
});

describe('transactionOfAnswer, correcting the gross from what the page taxed', () => {

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
      netProceedings: [8.94], // excludes 1.58 unprinted withholding
      taxableBase: [10.52]
    };
  });

  it('raises the gross to the base, and the credited amount then yields the withholding', () => {
    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 10.52,
      tax: 1.58
    });
  });

  it('leaves a gross alone where a partial exemption made the base a fraction of it', () => {
    answer = {
      ...answer,
      grossValue: [11.56],
      taxableBase: [8.09],
      netProceedings: [9.31],
      tax: [2.25]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 11.56,
      tax: 2.25
    });
  });

  it('leaves the gross alone where the base sits one cent above it, that being a rounding and no deduction', () => {
    answer = {...answer, taxableBase: [8.95]};

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 8.94,
      tax: 0
    });
  });

  it('raises the gross to a base two cents above it, the rounding being all the tolerance covers', () => {
    answer = {...answer, taxableBase: [8.96]};

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 8.96,
      tax: 0.02
    });
  });

  it('leaves the gross alone on a tax notice, whose base is what the charge was computed from', () => {
    answer = {
      ...answer,
      transactionType: 'TAX',
      grossValue: [7.1],
      taxableBase: [25.38],
      netProceedings: [7.1],
      tax: []
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 7.1
    });
  });

  it('leaves the gross alone where the answer states two bases, neither of them singled out', () => {
    answer = {
      ...answer,
      taxableBase: [10.52, 8.09]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 8.94,
      tax: 0
    });
  });
});

describe('transactionOfAnswer, a distribution paid out of the contribution account', () => {

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
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
    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2024-05-16',
      securityCountOriginal: 100,
      grossValue: 42
    });
  });

  it('leaves the sale that later carries the deferred tax alone, its base exceeding its gross', () => {
    // the acquisition cost was reduced by dividends (§27 KStG), so taxable base on a sell is larger as it includes those dividends
    answer = {
      ...answer,
      transactionType: 'SELL',
      grossValue: [1000],
      tax: [264.5],
      netProceedings: [735.5],
      taxableBase: [1042]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-05-16',
      securityCountOriginal: 100,
      grossValue: 1000,
      tax: 264.5
    });
  });
});

describe('transactionOfAnswer, dropping a line the settlement total disowns', () => {

  /** @type {import('./transaction-extraction.js').ExtractedAnswer} */
  let answer;

  beforeEach(() => {
    answer = {
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: [28.95],
      tax: [4.34, 17.36, 2.83, 0.15, 0.25], // sum of all values: 24.93; actual sum after removing 17.36: 7.57
      fee: [],
      netProceedings: [21.38],
      taxableBase: [11.59]
    };
  });

  it('drops the one line whose removal makes the page\'s own total hold out of the tax list', () => {
    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 7.57
    });
  });

  it('drops the total line out of the tax list where the page printed it beside the lines it sums', () => {
    answer = {
      ...answer,
      tax: [4.34, 2.83, 0.15, 0.25, 7.57] // each partial tax and the total printed under them, so the list is 2 x 7.57
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 7.57
    });
  });

  it('drops the one line whose removal makes the page\'s own total hold out of the fee list', () => {
    answer = {
      ...answer,
      tax: [4.34, 2.83, 0.15, 0.25],
      fee: [17.36]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 7.57
    });
  });

  it('drops the total line out of the fee list where the page printed it beside the lines it sums', () => {
    answer = {
      ...answer,
      tax: [4.34, 2.83],
      fee: [0.15, 0.25, 0.4] // each partial fee and the total printed under them, so the fee list is 2 x 0.40
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 7.17,
      fee: 0.4
    });
  });

  it('drops a line carrying more decimals than the overshoot, as the two are compared in whole cents', () => {
    answer = {
      ...answer,
      tax: [4.34, 17.356, 2.83, 0.15, 0.25] // sum: 24.926
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 7.57
    });
  });

  it('leaves an answer alone where no single line accounts for the overshoot', () => {
    answer = {
      ...answer,
      tax: [4.34, 10, 7.36, 2.83, 0.15, 0.25]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 24.93
    });
  });

  it('leaves an answer alone where two lines each account for it', () => {
    // 28.95 less the 16.25 credited leaves 12.70 for the deductions, so the stated 21.38 overshoots by 8.68 -
    // and two of the three lines are that: one of the two 8.68 and 4.02
    answer = {
      ...answer,
      tax: [8.68, 8.68, 4.02],
      netProceedings: [16.25]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 21.38
    });
  });

  it('drops nothing on a tax notice, whose gross is the charge and settles at itself', () => {
    answer = {
      ...answer,
      transactionType: 'TAX',
      tax: [4.34, 17.36],
      netProceedings: [28.95]
    };

    expect(transactionOfAnswer(answer)).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 21.7
    });
  });
});
