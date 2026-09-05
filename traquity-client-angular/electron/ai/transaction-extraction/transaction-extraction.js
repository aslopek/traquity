const {z} = require('zod');
const {datesIn, maskDatesIn} = require('./printed-date.js');
const {readingsOf} = require('./printed-number.js');
const {maskTimesIn, timesIn} = require('./printed-time.js');

/**
 * The document-extraction usecase: the grammar a model decodes under, the message it is given, and the schema its
 * answer is read back through.
 *
 * The grammar is generated **for one document**. Every value has to come off the page, so each field is an
 * alternation over the literals that page actually prints. Therefore, answeres are guaranteed to only contain
 * data printed on a page.
 *
 * The ISIN is read off the page, and is no part of the answer at all.
 */

/**
 * The answer as the model states it: one list per monetary field, holding the lines it attributed to that field.
 *
 * `tax` and `fee` are required and may be empty, which is what an empty list means - the page prints no such line.
 * Leaving a key out is the failure mode an optional key invites, and a list the model has to write makes "there is
 * none" a decision instead of a slip. `grossValue` holds at least one line, since a transaction without one is not
 * a transaction.
 */
const extractedAnswerSchema = z.strictObject({
  transactionType: z.enum(['BUY', 'SELL', 'DIVIDEND', 'TAX']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  securityCountOriginal: z.number().positive(),
  grossValue: z.array(z.number()).min(1),
  tax: z.array(z.number()),
  fee: z.array(z.number()),
  netProceedings: z.array(z.number()),
  taxableBase: z.array(z.number())
});

/** @typedef {z.infer<typeof extractedAnswerSchema>} ExtractedAnswer */

/**
 * One transaction with every list already added up.
 *
 * @typedef {Object} ExtractedTransaction
 * @property {'BUY' | 'SELL' | 'DIVIDEND' | 'TAX'} transactionType
 * @property {string} date `yyyy-MM-dd`
 * @property {string | undefined} [time] `HH:mm:ss`; carried through from the answer, which states it or does not
 * @property {string | undefined} [isin] the security the page names, absent where it names none or more than one
 * @property {number} securityCountOriginal
 * @property {number} grossValue
 * @property {number} [tax] absent where the page prints no tax line
 * @property {number} [fee] absent where the page prints no fee line
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
 * @param {ExtractedAnswer} answer
 * @param {number} gross what the answer states
 * @returns {number | null}
 */
function grossOfTaxableBase(answer, gross) {
  // only a payment on a holding is taxed this way; a trade's base is a gain and a tax notice's gross is its charge
  if (answer.transactionType !== 'DIVIDEND' || answer.taxableBase.length !== 1) {
    return null;
  }
  /** @type {number} */
  const implied = sumOf(answer.taxableBase);
  const tolerance = 0.011;
  return implied > gross + tolerance ? implied : null;
}

/**
 * @param {ExtractedAnswer} answer
 * @param {string | undefined} isin the security the page names, absent where it names none or multiple
 * @returns {ExtractedTransaction} the answer with each monetary list replaced by its sum, the gross corrected where
 *   the page's own taxation implies a larger one, the unstated deduction folded into `tax`, the given ISIN put
 *   beside them, and `isin`/`tax`/`fee` left out entirely where no value is available
 */
function transactionOfAnswer(answer, isin) {
  const {grossValue, tax, fee, netProceedings, taxableBase, ...stated} = answer;
  /** @type {number} */
  const stagedGross = sumOf(grossValue);
  /** @type {number | null} */
  const impliedGross = grossOfTaxableBase(answer, stagedGross);
  /** @type {number} rounded to the "cent" the page states its amounts in, the division rarely landing on one */
  const gross = impliedGross == null ? stagedGross : Math.round(impliedGross * 100) / 100;

  /** @type {number | undefined} */
  const settled = netProceedings.length > 0 ? sumOf(netProceedings) : undefined;

  // an overshoot is a line that should not be there and an undershoot a line the page never printed
  /** @type {number | null} */
  const dropped = overstatedLine(stated.transactionType, gross, [...tax, ...fee], settled);
  /** @type {number[]} */
  const taxLines = without(tax, dropped);
  /** @type {number[]} */
  const feeLines = taxLines.length === tax.length ? without(fee, dropped) : fee;

  /** @type {number} */
  const fees = sumOf(feeLines);
  /** @type {number} */
  const taxes = sumOf([...taxLines, unstatedDeduction(stated.transactionType, gross, sumOf(taxLines) + fees, settled)]);

  return {
    ...stated,
    ...(isin == null ? {} : {isin}),
    grossValue: gross,
    ...(taxLines.length > 0 || taxes !== 0 ? {tax: taxes} : {}),
    ...(feeLines.length > 0 ? {fee: fees} : {})
  };
}

/**
 * What one document prints that a field may be lifted from. Every entry is already in the notation the answer uses,
 * which is what lets it become a grammar literal unchanged.
 *
 * @typedef {Object} DocumentLiterals
 * @property {string[]} dates `yyyy-MM-dd`, whichever notation the page states them in
 * @property {string[]} times `HH:mm:ss`, whichever precision the page states them to
 * @property {string[]} numbers every reading of every number the page prints, in the answer's notation
 */

/** @type {RegExp} */
const ISIN = /(?<![0-9A-Z])[A-Z]{2}[0-9A-Z]{9}[0-9](?![0-9A-Z])/g;

//
/**
 * One printed word of digits and the separators a number may carry, anchored at both ends against a letter or a
 * digit so the digits inside an ISIN are no number of their own.
 * @type {RegExp}
 */
const NUMERIC_WORD = /(?<![\dA-Za-z])[+-]?\d(?:[\d.,'\u2019\u00A0\u202F]*\d)?[+-]?(?![\dA-Za-z])/g;

/**
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {string[]} every distinct match, in the order the text prints them
 */
function distinctMatches(text, pattern) {
  return [...new Set(text.match(pattern) ?? [])];
}

/**
 * @param {string} text
 * @returns {string} the text with every word shaped like an ISIN replaced by as many spaces, so that everything
 *   around it keeps both its characters and its position
 */
function maskIsinsIn(text) {
  return text.replace(ISIN, match => ' '.repeat(match.length));
}

/**
 * The ISIN contained in a document. If exactly one ISIN can be found, it is returned. If none or
 * multiple are found, none is returned.
 *
 * @param {string} documentText the page as the extractor rendered it
 * @returns {string | undefined}
 */
function isinOf(documentText) {
  /** @type {string[]} */
  const candidates = distinctMatches(documentText, ISIN);
  return candidates.length === 1 ? candidates[0] : undefined;
}

/**
 * @param {string} documentText the page as the extractor rendered it
 * @returns {string[]} every distinct number reading, in the order the text prints them. Dates, times and ISINs are
 *   blanked out first, so their digits are read as the date, time or ISIN they belong to and not a second time as
 *   numbers standing on their own
 */
function numbersOf(documentText) {
  /** @type {string} */
  const withoutOtherLiterals = [maskDatesIn, maskTimesIn, maskIsinsIn].reduce((text, mask) => mask(text), documentText);
  return [...new Set((withoutOtherLiterals.match(NUMERIC_WORD) ?? []).flatMap(readingsOf))];
}

/**
 * The dates and the times a page states, each read into the answer's notation before it becomes a literal.
 *
 * A page prints these in its own notation just as it prints its figures in its own, and for the same reason the
 * reading happens here: an alternation built out of `04.04.2022` verbatim admits no date the schema accepts, and
 * one built only out of the `yyyy-MM-dd` a rendered label/value pair happens to carry offers the letter's own date
 * and not the trade's. `printed-date.js` and `printed-time.js` are where a printed word turns into the readings
 * these offer.
 *
 * @param {string} documentText the page as the extractor rendered it
 * @returns {DocumentLiterals}
 */
function literalsOf(documentText) {
  return {
    dates: datesIn(documentText),
    times: timesIn(documentText),
    numbers: numbersOf(documentText)
  };
}

/**
 * @param {string[]} values
 * @returns {string} the values as a GBNF alternation of quoted string literals
 */
function stringAlternation(values) {
  return values.map(value => `"\\"${value}\\""`).join(' | ');
}

/**
 * @param {string[]} values
 * @returns {string} the values as a GBNF alternation of bare number literals
 */
function numberAlternation(values) {
  return values.map(value => `"${value}"`).join(' | ');
}

/**
 * The grammar for one document. Every rule stands on one line: llama.cpp ends a rule at the first newline, so a rule
 * wrapped onto a second one is silently cut off and the whole grammar fails to parse.
 *
 * An <i>optional</i> key whose alternation would be empty is dropped from the object instead of being left to match nothing: an
 * empty alternation is not a grammar.
 *
 * A <i>required</i> key with no literals falls back to its general shape, since the answer needs it either way.
 *
 * @param {DocumentLiterals} literals
 * @returns {string}
 */
function grammarFor(literals) {
  /** @type {boolean} */
  const hasTime = literals.times.length > 0;
  /** @type {boolean} */
  const hasNumbers = literals.numbers.length > 0;

  /** @type {string} */
  const root = [
    '"{" ws "\\"transactionType\\":" ws type ws',
    '"," ws "\\"date\\":" ws date ws',
    ...(hasTime ? ['( "," ws "\\"time\\":" ws time ws )?'] : []),
    '"," ws "\\"securityCountOriginal\\":" ws amount ws',
    '"," ws "\\"grossValue\\":" ws lines ws',
    '"," ws "\\"tax\\":" ws lines ws',
    '"," ws "\\"fee\\":" ws lines ws',
    '"," ws "\\"netProceedings\\":" ws lines ws',
    '"," ws "\\"taxableBase\\":" ws lines ws',
    '"}"'
  ].join(' ');

  return [
    `root ::= ${root}`,
    'type ::= "\\"BUY\\"" | "\\"SELL\\"" | "\\"DIVIDEND\\"" | "\\"TAX\\""',
    literals.dates.length > 0
      ? `date ::= ${stringAlternation(literals.dates)}`
      : 'date ::= "\\"" [0-9] [0-9] [0-9] [0-9] "-" [0-9] [0-9] "-" [0-9] [0-9] "\\""',
    ...(hasTime ? [`time ::= ${stringAlternation(literals.times)}`] : []),
    // A monetary field is the lines the page prints for it, so an empty list is how "there is none" is stated and
    // the sum never has to be a literal of its own
    'lines ::= "[" ws ( amount ( ws "," ws amount )* ws )? "]"',
    hasNumbers ? `amount ::= ${numberAlternation(literals.numbers)}` : 'amount ::= number',
    // Eight decimals, because a quantity is what this has to carry and a broker executes a savings plan on a
    // fraction of a share; an amount never comes near that many
    'number ::= "-"? ( "0" | [1-9] [0-9]{0,15} ) ( "." [0-9]{1,8} )?',
    'ws ::= [ \\t\\r\\n]{0,20}'
  ].join('\n');
}

/**
 * @param {string} documentText the page as the extractor rendered it
 * @param {string} currency the three-letter code every amount in the answer is to be denoted in
 * @returns {string} the message the model reads, the currency stated before the page so the rule it governs is
 *   read before the text it applies to
 */
function messageFor(documentText, currency) {
  return `Currency: \`${currency}\`\n\n${documentText}`;
}

module.exports = {
  extractedAnswerSchema,
  transactionOfAnswer,
  grammarFor,
  isinOf,
  literalsOf,
  messageFor
};
