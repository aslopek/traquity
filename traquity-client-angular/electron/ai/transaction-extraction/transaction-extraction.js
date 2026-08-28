const {z} = require('zod');

/**
 * The document-extraction usecase: the grammar a model decodes under, the message it is given, and the schema its
 * answer is read back through.
 *
 * **The model sorts, and states nothing.** The grammar generated for a document is a scaffold whose token ids are
 * literals, so the answer can only fill one category per token. A value the model never sees is a value it cannot
 * emit, and a value it does see it cannot alter.
 *
 * **The page is read exactly once, and not here.** The tokens arrive with the request, normalized, from the tier
 * that parsed the document. Nothing in this module opens the document text.
 */

/** The fields a page states as many lines of as it likes. */
const MONETARY = ['gross', 'tax', 'fee', 'netProceedings', 'taxBase'];

/** The token ids a field takes, each id an amount the page states. */
const amountIds = z.array(z.int().positive());

/**
 * The answer: the transaction's type, and which token each field takes.
 *
 * Every field names ids and never values, so the model states nothing the page does not. The single-valued fields
 * are one id, the monetary ones a list, since a page states as many tax and fee lines as it likes.
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
 * Adding `0.1 + 0.2` in binary floating point is what puts `159.00000000000003` into an amount, so the addends are
 * scaled to whole units of their own finest decimal first and the result is scaled back once.
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
 * Whether the transaction's total is what the customer paid instead of what they received. A purchase settles at
 * the gross plus everything taken on top of it; a sale and a payment on a holding settle at the gross less the
 * same.
 *
 * @param {ExtractedAnswer['transactionType']} transactionType
 * @returns {boolean}
 */
function isCharge(transactionType) {
  return transactionType === 'BUY' || transactionType === 'TAX';
}

/**
 * What the page's own settlement total says is missing from the lines the answer carries. In some cases,
 * a foreign withholding (tax) may not be explicitly printed on a page. This function is meant for finding
 * such unmentioned deductions.
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
  // in whole "cents" (or whatever the currency names it) throughout, since a gap is a difference of differences
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
 * A settlement prints entries that look like a deduction and move no money - a credit for tax paid abroad, an
 * offset against a loss pot - and a list that swept one in overshoots the total the document settles at. Where
 * exactly one of the lines equals the overshoot, that line is the one to drop and dropping it makes the
 * arithmetic come out; where none or several do, the answer is wrong in some way this cannot name and nothing is
 * changed. Only ever removes a figure the model itself stated, and never reaches for another number of the page.
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
  /** @type {number} what the deductions have to come to for the page's own total to hold, in whole cents */
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
 * Whether a charge is stated twice: once as the whole of the transaction, and again as the lines it was computed in.
 *
 * A page that settles no trade and pays nothing out raises a charge, and the withholding lines printed above that
 * charge add up to it exactly - they are the working the page did to arrive at it, and not money taken on top of
 * it. So an answer whose deductions come to the whole of the gross has counted that one charge twice, and doubles
 * what the page took. The arithmetic is what says so and no label is needed for it: on a page whose gross is the
 * charge, nothing else can make the deductions come to all of it.
 *
 * Only `TAX`, where the charge *is* the transaction. Every other type deducts its tax from something, and there a
 * deduction equal to the gross is a settlement of nothing - odd, but not this.
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
  // in whole "cents" (or whatever the currency names it), so the comparison is of two integers
  /** @type {number} */
  const gross = Math.round(grossValue * 100);
  return gross > 0 && deductions.reduce((total, line) => total + Math.round(line * 100), 0) === gross;
}

/**
 * Which line is `dropped` is decided in whole cents: both figures are multiplied by 100 and rounded, and those two
 * integers are what `===` compares.
 *
 * @param {number[]} lines
 * @param {number | null} dropped the line to remove, `null` where there is none to remove
 * @returns {number[]} the lines with the first one rounding to the same whole cent as `dropped` removed, and the
 *   lines themselves where `dropped` is `null` or no line rounds to that cent
 */
function without(lines, dropped) {
  /** @type {number} */
  const at = dropped == null ? -1 : lines.findIndex(line => Math.round(line * 100) === Math.round(dropped * 100));
  return at < 0 ? lines : [...lines.slice(0, at), ...lines.slice(at + 1)];
}

/**
 * The gross a payment's own taxation implies, where the page states what the tax was computed on.
 *
 * A payment taxed on a figure larger than the gross the answer states was read off a line that already had money
 * taken out of it. The base is the gross without any deductions. That recovers it for a page whose only printed
 * amounts are that base and what reached the account after a withholding taken abroad.
 *
 * A partial exemption (a German `Teilfreistellung`) makes the base a *fraction* of the payment instead, so such a
 * base is smaller than the gross and the guard below leaves it alone.
 *
 * `null` for anything other than a payment on a holding, where the page states no base, and where the arithmetic is
 * not a correction to make: a base **below** the gross already stated is a base narrowed by something other than an
 * exemption (an allowance, a loss offset), and says nothing about the gross.
 *
 * Several bases yield `null` too. Which of them the payment was taxed on is a choice this cannot make, and adding
 * them up states a gross no line of the page carries - so an answer holding more than one keeps the gross it stated.
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
  const cents = isCharge(transactionType)
    ? Math.round(settled * 100) - Math.round(deductions * 100)
    : Math.round(settled * 100) + Math.round(deductions * 100);
  return cents > 0 ? cents / 100 : undefined;
}

/**
 * The gross of a page stating no gross line of its own, in the order the page answers it.
 *
 * A payment taxed on a base is taxed on its gross, so that base is the answer where the page states one. Otherwise
 * the settlement total with the deductions put back is what the page implies.
 *
 * @param {SortedTokens} sorted
 * @param {number | undefined} settled
 * @returns {number | undefined}
 */
function grossWithNoLineOfItsOwn(sorted, settled) {
  if (sorted.transactionType === 'DIVIDEND' && sorted.taxBase.length === 1) {
    return sumOf(sorted.taxBase);
  }
  return grossOfSettlement(sorted.transactionType, settled, sumOf([...sorted.tax, ...sorted.fee]));
}

/**
 * @param {ExtractedAnswer} answer
 * @param {DocumentToken[]} tokens
 * @returns {ExtractedTransaction | null} each list replaced by its sum, the gross corrected where the page's own
 *   taxation implies a larger one, and the unstated deduction folded into `tax`; `null` where the sorting leaves
 *   the transaction without a date, a count or a gross
 */
function transactionOfAnswer(answer, tokens) {
  /** @type {SortedTokens} */
  const sorted = sortedTokensOf(answer, tokens);
  if (sorted.date == null || sorted.count == null) {
    return null;
  }

  /** @type {number | undefined} */
  const settled = sorted.netProceedings.length > 0 ? sumOf(sorted.netProceedings) : undefined;
  /** @type {number | undefined} */
  const stagedGross = sorted.gross.length > 0
    ? sumOf(sorted.gross)
    : grossWithNoLineOfItsOwn(sorted, settled);
  if (stagedGross == null) {
    return null;
  }
  /** @type {number | null} */
  const impliedGross = grossOfTaxableBase(sorted, stagedGross);
  /** @type {number} rounded to the "cent" the page states its amounts in, the division rarely landing on one */
  const gross = impliedGross == null ? stagedGross : Math.round(impliedGross * 100) / 100;

  // an overshoot is a line that should not be there and an undershoot a line the page never printed
  /** @type {number | null} */
  const dropped = overstatedLine(sorted.transactionType, gross, [...sorted.tax, ...sorted.fee], settled);
  /** @type {number[]} */
  const keptTax = without(sorted.tax, dropped);
  /** @type {number[]} */
  const keptFee = keptTax.length === sorted.tax.length ? without(sorted.fee, dropped) : sorted.fee;

  // where the deductions are the charge itself, they are its working and the gross alone is the transaction
  /** @type {boolean} */
  const statedTwice = chargeStatedTwice(sorted.transactionType, gross, [...sorted.tax, ...sorted.fee]);
  /** @type {number[]} */
  const taxLines = statedTwice ? [] : keptTax;
  /** @type {number[]} */
  const feeLines = statedTwice ? [] : keptFee;

  /** @type {number} */
  const fees = sumOf(feeLines);
  /** @type {number} */
  const taxes = sumOf([...taxLines, unstatedDeduction(sorted.transactionType, gross, sumOf(taxLines) + fees, settled)]);

  return {
    transactionType: sorted.transactionType,
    date: sorted.date,
    ...(sorted.time == null ? {} : {time: sorted.time}),
    securityCountOriginal: sorted.count,
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
 * @param {string} value
 * @returns {string} the value as a GBNF string literal
 */
function stringLiteral(value) {
  return `"\\"${value}\\""`;
}

/**
 * The grammar for one document: a fixed object whose keys are the token ids, each value one category.
 *
 * Every rule stands on one line, since llama.cpp ends a rule at the first newline. A document stating no token gets
 * the type alone, an empty object being the only thing its `tokens` could hold.
 *
 * @param {DocumentToken[]} tokens
 * @returns {string}
 */
function grammarFor(tokens) {
  /** @type {(kind: string) => number[]} */
  const idsOf = kind => tokens.filter(token => token.kind === kind).map(token => token.id);
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
 * @param {string} currency the code every amount in the answer is denoted in
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
