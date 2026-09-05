/**
 * A number as a document prints it, read into the notation an answer uses: a dot for the decimal point, no
 * grouping separators, no leading zeros and no booking sign.
 *
 * Both conventions are read at once, since a broker document states no locale of its own: the **last** dot or
 * comma is the decimal point and every earlier one groups thousands, so `1.005,00` and `1,005.00` are both
 * `1005.00`. An apostrophe and a non-breaking space group and never open a fraction, so they are removed before
 * that rule applies. A leading or trailing `-`/`+` marks the direction of a booking and is dropped with the rest
 * of the notation, since a transaction's direction is carried by its type. A number wrapped in parentheses is
 * that same statement in the accounting notation US brokers print, so `(9.90)` is `9.90` exactly as `9,90-` is -
 * both pairs have to be balanced, a lone bracket being a fragment of something else.
 *
 * The number of decimals is not bounded here. A quantity is printed with as many as the broker executed it at -
 * `0,55814` is a share of an ETF - and reading only two of them turns a fraction into a different number.
 *
 * One shape stays genuinely ambiguous: a lone separator with exactly three digits behind it, where `1.005` is a
 * thousand and five to one reader and a fraction to another. Both readings are returned for it, since a page
 * carrying a quantity of `1.005` shares and a page carrying a price of `1005` are the same page to a parser.
 * Behind a `0` no grouping is possible, so `0,132` is a fraction and nothing else.
 *
 * An ASCII space is deliberately no grouping separator. This module reads a page whose columns and words are
 * already separated by spaces, so admitting one would join two unrelated figures into a number the page never
 * printed - and, where the join fails to be a number at all, lose both of them.
 */

/** Separators that only ever group: the Swiss apostrophe, its typographic form, and the non-breaking spaces. */
const GROUPING_ONLY = /['\u2019\u00A0\u202F]/g;

/** The shapes a printed number may take, once the grouping-only separators and the booking sign are gone. */
const NUMBER = /^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?$|^\d+(?:[.,]\d+)?$/;

/**
 * @param {string} integerPart the digits before the decimal point, possibly still carrying grouping separators
 * @param {string} fraction the digits behind the decimal point, as printed
 * @returns {string} the two joined in the answer's notation, the integer part without leading zeros so the result
 *   is a JSON number and not something JSON refuses to parse
 */
function decimalOf(integerPart, fraction) {
  const digits = integerPart.replace(/[.,]/g, '').replace(/^0+(?=\d)/, '');
  return fraction === '' ? digits : `${digits}.${fraction}`;
}

/**
 * @param {string} printed one word as the page prints it
 * @returns {string[]} every reading of that word in the answer's notation, the likelier one first; empty where the
 *   word is no number
 */
function readingsOf(printed) {
  const digitsAndSeparators = printed
    .replace(/^\((.*)\)$/, '$1')
    .replace(GROUPING_ONLY, '')
    .replace(/^[+-]/, '')
    .replace(/[+-]$/, '');
  if (!NUMBER.test(digitsAndSeparators)) {
    return [];
  }

  const cut = Math.max(digitsAndSeparators.lastIndexOf('.'), digitsAndSeparators.lastIndexOf(','));
  if (cut < 0) {
    return [decimalOf(digitsAndSeparators, '')];
  }

  const head = digitsAndSeparators.slice(0, cut);
  const tail = digitsAndSeparators.slice(cut + 1);
  const separators = (digitsAndSeparators.match(/[.,]/g) ?? []).length;

  if (tail.length !== 3) {
    return [decimalOf(head, tail)];
  }
  if (separators > 1) {
    return [decimalOf(digitsAndSeparators, '')];
  }
  return head === '0' ? [decimalOf(head, tail)] : [decimalOf(digitsAndSeparators, ''), decimalOf(head, tail)];
}

module.exports = {readingsOf};
