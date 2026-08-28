const {beforeEach, describe, expect, it} = require('@jest/globals');
const {extractedAnswerSchema, grammarFor, messageFor, transactionOfAnswer} =
  require('./transaction-extraction.js');

/** @import {ExtractedAnswer, ExtractedTransaction} from './transaction-extraction.js' */

/** @import {DocumentToken} from '../../ipc/ipc-schema.js' */
/**
 * @param {Partial<DocumentToken>} [overrides]
 * @returns {DocumentToken}
 */
function tokenFactory(overrides = {}) {
  return {
    // no id here equals its position in a fixture, so a reading by position cannot pass for one by id
    id: 7,
    kind: 'number',
    text: '1.700,00',
    value: '1700.00',
    label: 'Kurswert',
    ...overrides
  };
}



/**
 * The values a page states, named as a transaction names them.
 *
 * @typedef {Object} StatedValues
 * @property {'BUY' | 'SELL' | 'DIVIDEND' | 'TAX'} transactionType
 * @property {string} [date]
 * @property {string} [time]
 * @property {number} [securityCountOriginal]
 * @property {number[]} [grossValue]
 * @property {number[]} [tax]
 * @property {number[]} [fee]
 * @property {number[]} [netProceedings]
 * @property {number[]} [taxableBase]
 */

/**
 * One token per stated value, and an answer picking the single-valued ones by id and sorting the amounts.
 *
 * @param {StatedValues} stated
 * @returns {[ExtractedAnswer, DocumentToken[]]}
 */
function sorting(stated) {
  /** @type {DocumentToken[]} */
  const tokens = [];

  /** @type {(kind: 'date' | 'time' | 'number', value: string) => number} */
  const state = (kind, value) => {
    // spaced out, so no id equals its position and a lookup by position cannot pass for one by id
    const id = tokens.length * 3 + 2;
    tokens.push({id, kind, text: value, value, label: kind});
    return id;
  };
  /** @type {(values: number[] | undefined) => number[]} */
  const states = values => (values ?? []).map(value => state('number', String(value)));

  /** @type {{date?: number, time?: number, count?: number}} */
  const picked = {};
  if (stated.date != null) {
    picked.date = state('date', stated.date);
  }
  if (stated.time != null) {
    picked.time = state('time', stated.time);
  }
  if (stated.securityCountOriginal != null) {
    picked.count = state('number', String(stated.securityCountOriginal));
  }

  return [
    {
      transactionType: stated.transactionType,
      ...picked,
      gross: states(stated.grossValue),
      tax: states(stated.tax),
      fee: states(stated.fee),
      netProceedings: states(stated.netProceedings),
      taxBase: states(stated.taxableBase)
    },
    tokens
  ];
}

describe('grammarFor', () => {
  /** @type {DocumentToken[]} */
  let tokens;

  beforeEach(() => {
    tokens = [
      tokenFactory({id: 3, kind: 'date', value: '2024-02-02'}),
      tokenFactory({id: 7, kind: 'time', value: '14:05:00'}),
      tokenFactory({id: 11, value: '1700.00'}),
      tokenFactory({id: 12, value: '25.32'})
    ];
  });

  it('states one rule per line: every field of a transaction, each admitting the ids the page states', () => {
    /** @type {string[]} */
    const rules = grammarFor(tokens).split('\n');

    expect(rules).toHaveLength(8);
    expect(rules[0]).toEqual('root ::= "{" ws "\\"transactionType\\":" ws type ws'
      + ' "," ws "\\"date\\":" ws date ws "," ws "\\"time\\":" ws time ws "," ws "\\"count\\":" ws count ws'
      + ' "," ws "\\"gross\\":" ws ids ws "," ws "\\"tax\\":" ws ids ws "," ws "\\"fee\\":" ws ids ws'
      + ' "," ws "\\"netProceedings\\":" ws ids ws "," ws "\\"taxBase\\":" ws ids ws "}"');
    expect(rules[1]).toEqual('type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""');
    expect(rules[2]).toEqual('date ::= "3"');
    expect(rules[3]).toEqual('time ::= "7"');
    expect(rules[4]).toEqual('count ::= "11" | "12"');
    expect(rules[5]).toEqual('ids ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"');
    expect(rules[6]).toEqual('amount ::= "11" | "12"');
    expect(rules[7]).toEqual('ws ::= [ \\t\\r\\n]{0,20}');
  });

  it('admits every date the page states as the one a transaction takes', () => {
    tokens = [...tokens, tokenFactory({id: 19, kind: 'date', value: '2024-02-05'})];

    expect(grammarFor(tokens).split('\n')).toContain('date ::= "3" | "19"');
  });

  it('asks for no date where the page states none', () => {
    tokens = [tokenFactory()];

    expect(grammarFor(tokens)).not.toContain('date');
  });

  it('asks for no time where the page states none', () => {
    tokens = [tokenFactory()];

    expect(grammarFor(tokens)).not.toContain('time');
  });

  it('asks for no count and no amount where the page states no candidates', () => {
    tokens = [tokenFactory({id: 5, kind: 'date', value: '2024-02-02'})];

    expect(grammarFor(tokens).split('\n')).toContain('ids ::= "[" ws "]"');
    expect(grammarFor(tokens)).not.toContain('count');
    expect(grammarFor(tokens)).not.toContain('amount');
  });
});

describe('messageFor', () => {
  /** @type {DocumentToken[]} */
  let tokens;

  beforeEach(() => {
    tokens = [tokenFactory()];
  });

  it('states the currency, then the page, then the tokens to sort', () => {
    expect(messageFor('Kurswert  |  1.700,00 EUR', tokens, 'EUR')).toBe(
      'Currency: `EUR`\n\n' +
      'Kurswert  |  1.700,00 EUR' +
      '\n\n--- values read off the page ---\n' +
      '7. number 1700.00 — Kurswert (printed as 1.700,00)');
  });

  it('numbers a token by the id it carries', () => {
    tokens = [tokenFactory({id: 23})];

    expect(messageFor('x', tokens, 'EUR')).toContain('\n23. number 1700.00 — Kurswert (printed as 1.700,00)');
  });

  it('lists every token the page states, one per line, in the order it states them', () => {
    tokens = [
      tokenFactory({id: 4, kind: 'date', text: '02.01.2025', value: '2025-01-02', label: 'Valuta'}),
      tokenFactory({id: 9, text: '25,32', value: '25.32', label: 'Steuer'})
    ];

    expect(messageFor('x', tokens, 'EUR')).toBe('Currency: `EUR`\n\nx\n\n--- values read off the page ---'
      + '\n4. date 2025-01-02 — Valuta (printed as 02.01.2025)'
      + '\n9. number 25.32 — Steuer (printed as 25,32)');
  });

  it('states the currency of an amount the page denotes', () => {
    tokens = [tokenFactory({currency: 'EUR'})];

    expect(messageFor('x', tokens, 'EUR')).toContain('7. number 1700.00 EUR — Kurswert (printed as 1.700,00)');
  });

  it('lists a token the page prints no label for', () => {
    tokens = [tokenFactory({label: null})];

    expect(messageFor('x', tokens, 'EUR')).toContain('7. number 1700.00 (printed as 1.700,00)');
  });

  it('states a date in the notation an answer uses, beside the text it was printed as', () => {
    tokens = [tokenFactory({kind: 'date', text: '02.01.2025', value: '2025-01-02', label: 'Valuta'})];

    expect(messageFor('x', tokens, 'EUR')).toContain('7. date 2025-01-02 — Valuta (printed as 02.01.2025)');
  });

  it('lists nothing where the page states no token', () => {
    tokens = [];

    expect(messageFor('x', tokens, 'EUR')).toBe('Currency: `EUR`\n\nx\n\n--- values read off the page ---\n');
  });
});

describe('transactionOfAnswer', () => {
  /** @type {StatedValues} */
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
    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

describe('transactionOfAnswer, an id sorted into a category of another kind', () => {
  /** @type {DocumentToken[]} */
  let tokens;
  /** @type {ExtractedAnswer} */
  let answer;

  beforeEach(() => {
    tokens = [
      {id: 2, kind: 'date', text: '02.02.2024', value: '2024-02-02', label: 'Valuta'},
      {id: 5, kind: 'number', text: '10', value: '10', label: 'Stueck'},
      {id: 8, kind: 'number', text: '1.700,00', value: '1700.00', label: 'Kurswert'}
    ];
    answer = {
      transactionType: 'SELL',
      date: 2,
      count: 5,
      gross: [8],
      tax: [],
      fee: [],
      netProceedings: [],
      taxBase: []
    };
  });

  it('states the transaction where every id names a token of the kind its category takes', () => {
    expect(transactionOfAnswer(answer, tokens)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      securityCountOriginal: 10,
      grossValue: 1700
    });
  });

  it('drops a date sorted into a monetary field, a date being no amount whatever it was sorted into', () => {
    answer = {...answer, tax: [2]};

    expect(transactionOfAnswer(answer, tokens)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      securityCountOriginal: 10,
      grossValue: 1700
    });
  });

  it('states no transaction where the date names an amount, that leaving it without a date', () => {
    answer = {...answer, date: 8};

    expect(transactionOfAnswer(answer, tokens)).toBeNull();
  });

  it('drops a date sorted into the count, that leaving the transaction without one', () => {
    answer = {...answer, count: 2};

    expect(transactionOfAnswer(answer, tokens)).toBeNull();
  });

  it('drops an id no token of the page carries', () => {
    answer = {...answer, tax: [99]};

    expect(transactionOfAnswer(answer, tokens)).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      securityCountOriginal: 10,
      grossValue: 1700
    });
  });
});

describe('transactionOfAnswer, an answer that leaves a transaction incomplete', () => {
  /** @type {StatedValues} */
  let answer;

  beforeEach(() => {
    // the minimum a transaction needs (type, date, securityCountOriginal, grossValue)
    answer = {
      transactionType: 'SELL',
      date: '2024-02-02',
      securityCountOriginal: 10,
      grossValue: [1700],
      tax: [],
      fee: [],
      netProceedings: [],
      taxableBase: []
    };
  });

  it('states the transaction where the sorting leaves the date, the count and the gross', () => {
    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-02-02',
      securityCountOriginal: 10,
      grossValue: 1700
    });
  });

  it('states none where the sorting leaves no date', () => {
    const {date, ...statingNoDate} = answer;

    expect(transactionOfAnswer(...sorting(statingNoDate))).toBeNull();
  });

  it('states none where the sorting leaves no count', () => {
    const {securityCountOriginal, ...statingNoCount} = answer;

    expect(transactionOfAnswer(...sorting(statingNoCount))).toBeNull();
  });

  it('states none where the sorting leaves no gross and nothing implies one', () => {
    answer = {...answer, grossValue: []};

    expect(transactionOfAnswer(...sorting(answer))).toBeNull();
  });
});

describe('transactionOfAnswer, reconciling against the settlement total', () => {
  /** @type {StatedValues} */
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
    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 3.83,
      tax: 0.58
    });
  });

  it('takes the gap as a withholding the page never printed a line for', () => {
    answer = {...answer, tax: []};

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'BUY',
      date: '2022-07-15',
      securityCountOriginal: 13,
      grossValue: 100
    });
  });
});

describe('transactionOfAnswer, correcting the gross from what the page taxed', () => {
  /** @type {StatedValues} */
  let answer;

  beforeEach(() => {
    // the payment is stated only as the base it was taxed on and the amount that reached the account
    answer = {
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: [8.94],
      tax: [0], // the page prints a withholding line reading zero, which is a stated line and not an absent one
      fee: [],
      netProceedings: [8.94], // excludes 1.58 unprinted withholding
      taxableBase: [10.52]
    };
  });

  it('raises the gross to the base, and the credited amount then yields the withholding', () => {
    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 11.56,
      tax: 2.25
    });
  });

  it('leaves the gross alone where the base sits one hundredth above it, that being a rounding and no deduction', () => {
    answer = {...answer, taxableBase: [8.95]};

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 8.94,
      tax: 0
    });
  });

  it('raises the gross to a base two hundredths above it, the rounding being all the tolerance covers', () => {
    answer = {...answer, taxableBase: [8.96]};

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-05-05',
      securityCountOriginal: 65,
      grossValue: 8.94,
      tax: 0
    });
  });
});

describe('transactionOfAnswer, a distribution paid according to German §27 KStG', () => {
  /** @type {StatedValues} */
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
    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2024-05-16',
      securityCountOriginal: 100,
      grossValue: 42
    });
  });

  it('leaves the sale that later carries the deferred tax alone, its base exceeding its gross', () => {
    // the acquisition cost was reduced by dividends, so taxable base on a sell is larger as it includes those dividends
    answer = {
      ...answer,
      transactionType: 'SELL',
      grossValue: [1000],
      tax: [264.5],
      netProceedings: [735.5],
      taxableBase: [1042]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'SELL',
      date: '2024-05-16',
      securityCountOriginal: 100,
      grossValue: 1000,
      tax: 264.5
    });
  });
});

describe('transactionOfAnswer, dropping a line the page\'s own total leaves no room for', () => {
  /** @type {StatedValues} */
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

  it('drops from the tax list the one line whose removal makes the page\'s own total add up', () => {
    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 7.57
    });
  });

  it('drops from the fee list the one line whose removal makes the page\'s own total add up', () => {
    answer = {
      ...answer,
      tax: [4.34, 2.83, 0.15, 0.25],
      fee: [17.36]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 7.17,
      fee: 0.4
    });
  });

  it('drops a line carrying more decimals than the overshoot, as the two are compared in whole hundredths', () => {
    answer = {
      ...answer,
      tax: [4.34, 17.356, 2.83, 0.15, 0.25] // sum: 24.926
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
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
      tax: [4.34, 10, 7.36, 2.83, 0.15, 0.25] // sum: 24.93
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 24.93
    });
  });

  it('drops one of two lines carrying the overshoot, the two being the same figure printed twice', () => {
    // 28.95 less the 16.25 credited leaves 12.70 for the deductions, so the stated 21.38 overshoots by 8.68 -
    // which two of the three lines carry, a withholding and the credit for that same withholding
    answer = {
      ...answer,
      tax: [8.68, 8.68, 4.02], // sum: 21.38
      netProceedings: [16.25]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 12.70
    });
  });

  it('drops nothing on a tax notice, whose gross is the charge and settles at itself', () => {
    answer = {
      ...answer,
      transactionType: 'TAX',
      tax: [4.34, 17.36], // sum: 21.7
      netProceedings: [28.95]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-06-09',
      securityCountOriginal: 25,
      grossValue: 28.95,
      tax: 21.7
    });
  });
});

describe('transactionOfAnswer, a charge stated as itself and as the lines it was computed in', () => {
  /** @type {StatedValues} */
  let answer;

  beforeEach(() => {
    answer = {
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: [7.1],
      tax: [6.21, 0.34, 0.55], // sum: 7.1 equals the gross value of the TAX transaction
      fee: [],
      netProceedings: [7.1],
      taxableBase: [36.26]
    };
  });

  it('takes the charge alone, the lines coming to all of it being the working that arrived at it', () => {
    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1
    });
  });

  it('takes the charge alone where one line restates the whole of it', () => {
    answer = {
      ...answer,
      tax: [7.1]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1
    });
  });

  it('empties a fee list that made up the charge with the tax lines, both being its working', () => {
    answer = {
      ...answer,
      tax: [6.21, 0.34],
      fee: [0.55]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1
    });
  });

  it('compares the lines against the charge in whole hundredths, as every other line of this module does', () => {
    answer = {
      ...answer,
      tax: [6.214, 0.34, 0.55] // 7.104, which is the charge to the hundredth the page states it in
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1
    });
  });

  it('keeps lines falling short of the charge, which state a part of it and not the whole', () => {
    answer = {
      ...answer,
      tax: [6.21, 0.34]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1,
      tax: 6.55
    });
  });

  it('keeps lines exceeding the charge, which no working of it can do', () => {
    answer = {
      ...answer,
      tax: [6.21, 0.34, 0.55, 1.2]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1,
      tax: 8.3
    });
  });

  it('keeps the tax of a payment whose deductions come to its gross, no other type stating its charge twice', () => {
    answer = {
      ...answer,
      transactionType: 'DIVIDEND',
      netProceedings: [0],
      taxableBase: [] // a base above the gross is what raises a payment's gross, which is not what this states
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'DIVIDEND',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1,
      tax: 7.1
    });
  });

  it('keeps the tax of a purchase whose deductions come to its gross, that type charging on top of it', () => {
    answer = {
      ...answer,
      transactionType: 'BUY',
      netProceedings: [14.2]
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'BUY',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1,
      tax: 7.1
    });
  });

  it('states a tax notice carrying no line of its own unchanged, there being nothing to drop', () => {
    answer = {
      ...answer,
      tax: []
    };

    expect(transactionOfAnswer(...sorting(answer))).toStrictEqual({
      transactionType: 'TAX',
      date: '2026-01-02',
      securityCountOriginal: 80,
      grossValue: 7.1
    });
  });
});
