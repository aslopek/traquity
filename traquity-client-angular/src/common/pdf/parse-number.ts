import {PdfNumberSign} from "./pdf-document.type";
import {undecorated} from "./undecorated";

export type ParsedNumber = {
  /** The magnitude, with no thousands separators and with any booking sign removed. */
  magnitude: number
  /** The booking direction printed with the amount, kept apart from the magnitude. */
  sign: PdfNumberSign | null
  /** Digits printed after the decimal separator. */
  digits: number
};

/** Separators that only ever group: the Swiss apostrophe, its typographic form, and the non-breaking spaces. */
const GROUPING_ONLY: RegExp = /[\u0027\u2019\u00A0\u202F]/g;

/** A currency symbol printed against the digits on either side, which belongs to the amount and is none of it. */
const SYMBOL: RegExp = /^[€$£¥₣₹]+|[€$£¥₣₹]+$/g;

/** An amount in the accounting notation, whose brackets have to be balanced — a lone one is part of something else. */
const BRACED: RegExp = /^\((.+)\)$/;

/** The shapes a printed number may take, once symbol, brackets, grouping-only separators and sign are gone. */
const NUMBER: RegExp = /^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?$|^\d+(?:[.,]\d+)?$/;

/**
 * As many decimals as are reported, which is past what a `number` holds meaningfully and inside what `toFixed`
 * accepts: a document printing more of them would otherwise turn every rendering of the value into a `RangeError`.
 */
const MAXIMUM_DECIMALS: number = 20;

/**
 * Every reading of a printed number, the likelier one first.
 *
 * Both conventions are read at once, since a broker document states no locale of its own: the **last** dot or comma
 * is the decimal point and every earlier one groups thousands, so `1.005,00` and `1,005.00` are both `1005`. An
 * apostrophe and a non-breaking space group and never open a fraction, so they are removed before that rule
 * applies. A currency symbol printed against the digits is stripped the same way.
 *
 * A leading or trailing `-`/`+` marks the direction of a booking and is reported separately from the magnitude,
 * since the direction of a transaction is carried by its type. Brackets state that same direction in the
 * accounting notation US brokers print, so `(9.90)` carries the sign `9,90-` does.
 *
 * The number of decimals is not bounded. A quantity is printed with as many as the broker executed it at —
 * `0,55814` is a share of an ETF — and reading only two of them turns a fraction into a different number.
 *
 * One shape stays genuinely ambiguous: a lone separator with exactly three digits behind it, where `1.005` is a
 * thousand and five to one reader and a fraction to another. **Both readings are returned for it**, the grouped one
 * first, since a page carrying a quantity of `1.005` shares and a page carrying a price of `1005` are the same page
 * to a parser. Behind a `0` no grouping is possible, so `0,132` is a fraction and nothing else.
 *
 * An ASCII space is deliberately no grouping separator: the words of a page are separated by spaces, so admitting
 * one would join two unrelated figures into a number the page never printed.
 *
 * @returns the readings, or nothing at all where the text is no number.
 */
export function readingsOfNumber(text: string): ParsedNumber[] {
  const trimmed: string = text.trim().replace(SYMBOL, "");
  const braced: boolean = BRACED.test(trimmed);

  let digitsAndSeparators: string = undecorated(braced ? trimmed.replace(BRACED, "$1") : trimmed, {keepSign: true});
  let sign: PdfNumberSign | null = braced ? "-" : null;
  if (digitsAndSeparators.endsWith("-") || digitsAndSeparators.endsWith("+")) {
    sign = sign ?? digitsAndSeparators.slice(-1) as PdfNumberSign;
    digitsAndSeparators = digitsAndSeparators.slice(0, -1);
  }
  if (digitsAndSeparators.startsWith("-") || digitsAndSeparators.startsWith("+")) {
    sign = sign ?? digitsAndSeparators[0] as PdfNumberSign;
    digitsAndSeparators = digitsAndSeparators.slice(1);
  }
  digitsAndSeparators = digitsAndSeparators.replace(GROUPING_ONLY, "");

  if (!NUMBER.test(digitsAndSeparators)) {
    return [];
  }

  const cut: number = Math.max(digitsAndSeparators.lastIndexOf("."), digitsAndSeparators.lastIndexOf(","));
  if (cut < 0) {
    return readings([{integerPart: digitsAndSeparators, fraction: ""}], sign);
  }

  const head: string = digitsAndSeparators.slice(0, cut);
  const tail: string = digitsAndSeparators.slice(cut + 1);
  const separators: number = (digitsAndSeparators.match(/[.,]/g) ?? []).length;
  const grouped: { integerPart: string, fraction: string } = {integerPart: digitsAndSeparators, fraction: ""};
  const fractional: { integerPart: string, fraction: string } = {integerPart: head, fraction: tail};

  if (tail.length !== 3) {
    return readings([fractional], sign);
  }
  if (separators > 1) {
    return readings([grouped], sign);
  }
  return readings(head === "0" ? [fractional] : [grouped, fractional], sign);
}

/**
 * A printed number as a JavaScript number, read the way both notations can be read at once.
 *
 * `1.005,00` and `1,005.00` are both `1005`, `2.4181` is `2.4181`, `0,75` is `0.75`. Where the notation is
 * ambiguous, the likelier reading is the one taken.
 *
 * @returns `null` when the text is not a number at all.
 */
export function parseNumber(text: string): ParsedNumber | null {
  return readingsOfNumber(text)[0] ?? null;
}

/** The split readings as numbers, dropping any that no `number` can hold. */
function readings(split: { integerPart: string, fraction: string }[], sign: PdfNumberSign | null): ParsedNumber[] {
  return split
    .map(({integerPart, fraction}): ParsedNumber => ({
      magnitude: Number(`${integerPart.replace(/[.,]/g, "")}.${fraction || "0"}`),
      sign,
      digits: Math.min(fraction.length, MAXIMUM_DECIMALS)
    }))
    .filter((parsed: ParsedNumber): boolean => Number.isFinite(parsed.magnitude));
}
