const {z} = require('zod');

/**
 * The document-extraction usecase: the grammar a model decodes under, the message it is given, and the schema its
 * answer is read back through.
 *
 * **The model sorts, and states nothing.** The grammar generated for a document is a scaffold whose token ids are
 * literals, so the answer can only fill one category per token. A value the model never sees it cannot emit, and a
 * value it does see it cannot alter.
 */

/** The fields a page states as many lines of as it likes. */
const MONETARY = ['gross', 'tax', 'fee', 'netProceedings', 'taxBase'];

/** The token ids a field takes, each id an amount the page states. */
const amountIds = z.array(z.int().positive());

/**
 * The answer: the transaction's type, and which token each field takes.
 *
 * Every field names ids and never values. A single-valued field takes one id, a monetary one a list, since a page
 * states as many tax and fee lines as it likes.
 */
const extractedAnswerSchema = z.strictObject({
  transactionType: z.enum(['BUY', 'SELL', 'DIVIDEND', 'TAX']),
  date: z.int().positive().optional(),
  time: z.int().positive().optional(),
  count: z.int().positive().optional(),
  gross: amountIds,
  tax: amountIds,
  fee: amountIds,
  netProceedings: amountIds,
  taxBase: amountIds
});

/** @typedef {z.infer<typeof extractedAnswerSchema>} ExtractedAnswer */
/** @import {DocumentToken} from '../../ipc/ipc-schema.js' */

/**
 * One transaction, every list already added up.
 *
 * @typedef {Object} ExtractedTransaction
 * @property {'BUY' | 'SELL' | 'DIVIDEND' | 'TAX'} transactionType
 * @property {string} date `yyyy-MM-dd`
 * @property {string | undefined} [time] `HH:mm:ss`
 * @property {number} securityCountOriginal
 * @property {number} grossValue
 * @property {number} [tax] absent where the page states no tax
 * @property {number} [fee] absent where the page states no fee
 */

/**
 * @param {number} value
 * @returns {number} how many decimals the value carries, read off its own notation
 */
function decimalsOf(value) {
  return String(value).split('.')[1]?.length ?? 0;
}

/**
 * The lines added up, in fixed point.
 *
 * `0.1 + 0.2` in binary floating point is what puts `159.00000000000003` into an amount, so the addends are scaled
 * to whole units of their finest decimal and the sum is scaled back once.
 *
 * @param {number[]} values
 * @returns {number}
 */
function sumOf(values) {
  /** @type {number} */
  const scale = 10 ** Math.max(0, ...values.map(decimalsOf));
  return values.reduce((total, value) => total + Math.round(value * scale), 0) / scale;
}

/**
 * Whether the transaction's total is what was paid instead of what was received. A purchase settles at the gross
 * plus everything taken on top of it; a sale and a payment on a holding settle at the gross less the same.
 *
 * @param {ExtractedAnswer['transactionType']} transactionType
 * @returns {boolean}
 */
function isCharge(transactionType) {
  return transactionType === 'BUY' || transactionType === 'TAX';
}

/**
 * What the page's own settlement total says is missing from the lines the answer carries — a foreign withholding
 * the page deducts without printing it, say.
 *
 * @param {ExtractedAnswer['transactionType']} transactionType
 * @param {number} grossValue
 * @param {number} deductions `tax` and `fee` together
 * @param {number | undefined} settled the total the page states, absent where it states none
 * @returns {number} the unaccounted deduction, `0` where there is none to find
 */
function unstatedDeduction(transactionType, grossValue, deductions, settled) {
  // A tax notice states one charge and settles at it; there is no gross and deduction to reconcile
  if (settled == null || transactionType === 'TAX') {
    return 0;
  }
  // in whole hundredths of the currency unit throughout, since a gap is a difference of differences
  /** @type {number} */
  const gross = Math.round(grossValue * 100);
  /** @type {number} */
  const accounted = isCharge(transactionType)
    ? gross + Math.round(deductions * 100)
    : gross - Math.round(deductions * 100);
  /** @type {number} */
  const gap = isCharge(transactionType) ? Math.round(settled * 100) - accounted : accounted - Math.round(settled * 100);
  // A gap wider than the gross is a misread of one of the two figures and not a deduction anyone withheld
  return gap > 0 && gap <= gross ? gap / 100 : 0;
}

/**
 * The one line the answer counted that the page's own total says it should not have.
 *
 * A settlement prints entries that look like a deduction and move no money — a credit for tax paid abroad, an
 * offset against a loss pot — so a list that swept one in overshoots the total the document settles at.
 *
 * @param {ExtractedAnswer['transactionType']} transactionType
 * @param {number} grossValue
 * @param {number[]} deductions every `tax` and `fee` line together
 * @param {number | undefined} settled the total the page states, absent where it states none
 * @returns {number | null} the line to drop, or `null` where there is no single one to blame
 */
function overstatedLine(transactionType, grossValue, deductions, settled) {
  if (settled == null || transactionType === 'TAX') {
    return null;
  }
  /** @type {number} what the deductions have to come to for the page's own total to hold, in whole hundredths */
  const target = isCharge(transactionType)
    ? Math.round(settled * 100) - Math.round(grossValue * 100)
    : Math.round(grossValue * 100) - Math.round(settled * 100);
  /** @type {number} */
  const excess = deductions.reduce((total, line) => total + Math.round(line * 100), 0) - target;
  if (excess <= 0) {
    return null;
  }
  /** @type {number[]} */
  const blamed = deductions.filter(line => Math.round(line * 100) === excess);
  return blamed.length === 1 ? excess / 100 : null;
}

/**
 * Whether a charge is stated twice: once as the whole transaction, and again as the lines it was computed from.
 *
 * On a page that settles no trade, the withholding lines printed above the charge add up to it exactly, so an
 * answer whose deductions come to the whole gross has counted that charge twice and doubles what the page took.
 *
 * Only for `TAX`, where the charge *is* the transaction. Every other type deducts its tax from something, so a
 * deduction equal to the gross is a settlement of nothing there — odd, but not this.
 *
 * @param {ExtractedAnswer['transactionType']} transactionType
 * @param {number} grossValue
 * @param {number[]} deductions every `tax` and `fee` line together
 * @returns {boolean}
 */
function chargeStatedTwice(transactionType, grossValue, deductions) {
  if (transactionType !== 'TAX' || deductions.length === 0) {
    return false;
  }
  // in whole hundredths of the currency unit, so the comparison is of two integers
  /** @type {number} */
  const gross = Math.round(grossValue * 100);
  return gross > 0 && deductions.reduce((total, line) => total + Math.round(line * 100), 0) === gross;
}

/**
 * @param {number[]} lines
 * @param {number | null} dropped the line to remove, `null` where there is none
 * @returns {number[]} the lines without the first one rounding to the same hundredth as `dropped`, and the lines
 *   themselves where `dropped` is `null` or no line rounds to it
 */
function without(lines, dropped) {
  /** @type {number} */
  const at = dropped == null ? -1 : lines.findIndex(line => Math.round(line * 100) === Math.round(dropped * 100));
  return at < 0 ? lines : [...lines.slice(0, at), ...lines.slice(at + 1)];
}

/**
 * The gross a payment's own taxation implies, where the page states what the tax was computed on.
 *
 * The base is the gross before any deduction, so a base larger than the gross the answer states means that gross
 * was read off a line money had already been taken out of. This recovers it for a page printing only the base and
 * what reached the account after a withholding taken abroad.
 *
 * A base **below** the stated gross is left alone: a partial exemption (a German `Teilfreistellung`), an allowance
 * or a loss offset narrows the base and says nothing about the gross. Several bases are left alone too — which one
 * the payment was taxed on is not decidable here, and adding them up states a gross no line of the page carries.
 *
 * @param {SortedTokens} sorted
 * @param {number} gross what the tokens state
 * @returns {number | null}
 */
function grossOfTaxableBase(sorted, gross) {
  // only a payment on a holding is taxed this way; a trade's base is a gain and a tax notice's gross is its charge
  if (sorted.transactionType !== 'DIVIDEND' || sorted.taxBase.length !== 1) {
    return null;
  }
  /** @type {number} */
  const implied = sumOf(sorted.taxBase);
  const tolerance = 0.011;
  return implied > gross + tolerance ? implied : null;
}

/**
 * The tokens of one category, in the order the page states them.
 *
 * @typedef {Object} SortedTokens
 * @property {'BUY' | 'SELL' | 'DIVIDEND' | 'TAX'} transactionType
 * @property {string | undefined} date
 * @property {string | undefined} time
 * @property {number | undefined} count
 * @property {number[]} gross
 * @property {number[]} tax
 * @property {number[]} fee
 * @property {number[]} netProceedings
 * @property {number[]} taxBase
 */

/**
 * The answer resolved against the tokens it sorted. A category the model applied to a token of the wrong kind is
 * dropped, since a date is no amount whatever it was sorted into.
 *
 * @param {ExtractedAnswer} answer
 * @param {DocumentToken[]} tokens
 * @returns {SortedTokens}
 */
function sortedTokensOf(answer, tokens) {
  /** @type {(id: number, kind: string) => string | undefined} */
  const valueOf = (id, kind) => tokens.find(token => token.id === id && token.kind === kind)?.value;
  /** @type {(ids: number[]) => number[]} */
  const amountsOf = ids => ids
    .map(id => valueOf(id, 'number'))
    .filter(value => value != null)
    .map(Number);

  /** @type {string | undefined} */
  const count = answer.count == null ? undefined : valueOf(answer.count, 'number');

  return {
    transactionType: answer.transactionType,
    date: answer.date == null ? undefined : valueOf(answer.date, 'date'),
    time: answer.time == null ? undefined : valueOf(answer.time, 'time'),
    count: count == null ? undefined : Number(count),
    gross: amountsOf(answer.gross),
    tax: amountsOf(answer.tax),
    fee: amountsOf(answer.fee),
    netProceedings: amountsOf(answer.netProceedings),
    taxBase: amountsOf(answer.taxBase)
  };
}

/**
 * The gross a settlement implies where the page states no gross line of its own: what was credited or charged,
 * with the deductions put back. Uses only figures the model itself pointed at.
 *
 * @param {ExtractedAnswer['transactionType']} transactionType
 * @param {number | undefined} settled
 * @param {number} deductions
 * @returns {number | undefined}
 */
function grossOfSettlement(transactionType, settled, deductions) {
  if (settled == null) {
    return undefined;
  }

  /** @type {number} */
  const grossHundredths = isCharge(transactionType)
    ? Math.round(settled * 100) - Math.round(deductions * 100)
    : Math.round(settled * 100) + Math.round(deductions * 100);
  return grossHundredths > 0 ? grossHundredths / 100 : undefined;
}

/**
 * The gross of a page stating no gross line of its own: the base a payment was taxed on where the page states one,
 * since a payment is taxed on its gross, and otherwise the settlement total with the deductions put back.
 *
 * @param {SortedTokens} sortedTokens
 * @param {number | undefined} settled
 * @returns {number | undefined}
 */
function grossWithNoLineOfItsOwn(sortedTokens, settled) {
  if (sortedTokens.transactionType === 'DIVIDEND' && sortedTokens.taxBase.length === 1) {
    return sumOf(sortedTokens.taxBase);
  }
  return grossOfSettlement(sortedTokens.transactionType, settled, sumOf([...sortedTokens.tax, ...sortedTokens.fee]));
}

/**
 * @param {ExtractedAnswer} answer
 * @param {DocumentToken[]} tokens
 * @returns {ExtractedTransaction | null} each list replaced by its sum, the gross corrected where the page's own
 *   taxation implies a larger one, and the unstated deduction added to `tax`; `null` where the sorting leaves
 *   the transaction without a date, a count or a gross
 */
function transactionOfAnswer(answer, tokens) {
  /** @type {SortedTokens} */
  const sortedTokens = sortedTokensOf(answer, tokens);
  if (sortedTokens.date == null || sortedTokens.count == null) {
    return null;
  }

  /** @type {number | undefined} */
  const settled = sortedTokens.netProceedings.length > 0 ? sumOf(sortedTokens.netProceedings) : undefined;
  /** @type {number | undefined} */
  const stagedGross = sortedTokens.gross.length > 0
    ? sumOf(sortedTokens.gross)
    : grossWithNoLineOfItsOwn(sortedTokens, settled);
  if (stagedGross == null) {
    return null;
  }
  /** @type {number | null} */
  const impliedGross = grossOfTaxableBase(sortedTokens, stagedGross);
  /** @type {number} rounded to the hundredth the page states its amounts in */
  const gross = impliedGross == null ? stagedGross : Math.round(impliedGross * 100) / 100;

  // an overshoot is a value that should not be there and an undershoot a value not present on the PDF
  /** @type {number | null} */
  const dropped = overstatedLine(sortedTokens.transactionType, gross, [...sortedTokens.tax, ...sortedTokens.fee], settled);
  /** @type {number[]} */
  const keptTax = without(sortedTokens.tax, dropped);
  /** @type {number[]} */
  const keptFee = keptTax.length === sortedTokens.tax.length ? without(sortedTokens.fee, dropped) : sortedTokens.fee;
  /** @type {boolean} where the deductions are the charge itself, they are its working and the gross alone is the transaction */
  const statedTwice = chargeStatedTwice(sortedTokens.transactionType, gross, [...sortedTokens.tax, ...sortedTokens.fee]);
  /** @type {number[]} */
  const taxLines = statedTwice ? [] : keptTax;
  /** @type {number[]} */
  const feeLines = statedTwice ? [] : keptFee;

  /** @type {number} */
  const fees = sumOf(feeLines);
  /** @type {number} */
  const taxes = sumOf([...taxLines, unstatedDeduction(sortedTokens.transactionType, gross, sumOf(taxLines) + fees, settled)]);

  return {
    transactionType: sortedTokens.transactionType,
    date: sortedTokens.date,
    ...(sortedTokens.time == null ? {} : {time: sortedTokens.time}),
    securityCountOriginal: sortedTokens.count,
    grossValue: gross,
    ...(taxLines.length > 0 || taxes !== 0 ? {tax: taxes} : {}),
    ...(feeLines.length > 0 ? {fee: fees} : {})
  };
}

/**
 * @param {number[]} ids
 * @returns {string} the ids as a GBNF alternation of bare number literals
 */
function numberAlternation(ids) {
  return ids.map(id => `"${id}"`).join(' | ');
}

/**
 * The grammar for one document: a fixed object whose keys are the token ids, each value one category.
 *
 * Every rule stands on one line, since llama.cpp ends a rule at the first newline. A document stating no token gets
 * the type alone.
 *
 * @param {DocumentToken[]} tokens
 * @returns {string}
 */
function grammarFor(tokens) {
  /** @type {(kind: string) => number[]} */
  const idsOf = (kind) => tokens.filter(token => token.kind === kind).map(token => token.id);
  /** @type {number[]} */
  const amounts = idsOf('number');

  /** @type {(field: string, ids: number[]) => string[]} */
  const one = (field, ids) => ids.length === 0 ? [] : [`"," ws "\\"${field}\\":" ws ${field} ws`];
  /** @type {(field: string) => string} */
  const many = field => `"," ws "\\"${field}\\":" ws ids ws`;

  /** @type {string} */
  const root = [
    '"{" ws "\\"transactionType\\":" ws type ws',
    ...one('date', idsOf('date')),
    ...one('time', idsOf('time')),
    ...one('count', amounts),
    ...MONETARY.map(many),
    '"}"'
  ].join(' ');

  return [
    `root ::= ${root}`,
    'type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""',
    ...(idsOf('date').length === 0 ? [] : [`date ::= ${numberAlternation(idsOf('date'))}`]),
    ...(idsOf('time').length === 0 ? [] : [`time ::= ${numberAlternation(idsOf('time'))}`]),
    ...(amounts.length === 0 ? [] : [`count ::= ${numberAlternation(amounts)}`]),
    amounts.length === 0
      ? 'ids ::= "[" ws "]"'
      : 'ids ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"',
    ...(amounts.length === 0 ? [] : [`amount ::= ${numberAlternation(amounts)}`]),
    'ws ::= [ \\t\\r\\n]{0,20}'
  ].join('\n');
}

/**
 * @param {string} documentText
 * @param {DocumentToken[]} tokens
 * @param {string} currency the code every currency amount in the answer is denoted in
 * @returns {string} the message the model reads: the rule, the page, and the tokens it sorts
 */
function messageFor(documentText, tokens, currency) {
  /** @type {string} */
  const listed = tokens
    .map(token => `${token.id}. ${token.kind} ${token.value}`
      + `${token.currency == null ? '' : ` ${token.currency}`}`
      + `${token.label == null ? '' : ` — ${token.label}`}`
      + ` (printed as ${token.text})`)
    .join('\n');

  return `Currency: \`${currency}\`\n\n${documentText}\n\n--- values read off the page ---\n${listed}`;
}

module.exports = {
  extractedAnswerSchema,
  transactionOfAnswer,
  grammarFor,
  messageFor,
  MONETARY
};
