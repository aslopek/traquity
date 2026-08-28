import {PdfNumberSign} from "./pdf-document.type";

export type ParsedNumber = {
  value: number
  /** The booking direction printed with the amount, kept apart from the magnitude. */
  sign: PdfNumberSign | null
  /** Digits printed after the decimal separator. */
  digits: number
};

const NUMBER: RegExp = /^[+-]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?[+-]?$|^[+-]?\d+(?:[.,]\d+)?[+-]?$/;

/**
 * A printed number as a JavaScript number, read the way both notations can be read at once: the **last** dot or
 * comma is the decimal point, every earlier one groups thousands and disappears. A leading or trailing `-`/`+`
 * marks the direction of a booking and is reported separately from the magnitude, since the direction of a
 * transaction is carried by its type and not by a sign.
 *
 * `1.005,00` and `1,005.00` are both `1005`, `2.4181` is `2.4181`, `0,75` is `0.75`.
 *
 * The one genuinely ambiguous shape is a lone separator with exactly three digits behind it: to a German reader
 * `1.005` is a thousand and five, to an English one it is a fraction. It is read as a thousands group, which is
 * what these documents mean by it — except behind a `0`, where no grouping is possible and `0,132` can only be a
 * fraction.
 *
 * @returns `null` when the text is not a number at all.
 */
export function parseNumber(text: string): ParsedNumber | null {
  const trimmed: string = text.trim();
  if (!NUMBER.test(trimmed)) {
    return null;
  }

  let digitsAndSeparators: string = trimmed;
  let sign: PdfNumberSign | null = null;
  if (digitsAndSeparators.endsWith("-") || digitsAndSeparators.endsWith("+")) {
    sign = digitsAndSeparators.slice(-1) as PdfNumberSign;
    digitsAndSeparators = digitsAndSeparators.slice(0, -1);
  }
  if (digitsAndSeparators.startsWith("-") || digitsAndSeparators.startsWith("+")) {
    sign = sign ?? digitsAndSeparators[0] as PdfNumberSign;
    digitsAndSeparators = digitsAndSeparators.slice(1);
  }

  const cut: number = Math.max(digitsAndSeparators.lastIndexOf("."), digitsAndSeparators.lastIndexOf(","));
  const tail: string = cut < 0 ? "" : digitsAndSeparators.slice(cut + 1);
  const separators: number = (digitsAndSeparators.match(/[.,]/g) ?? []).length;
  const grouping: boolean = cut >= 0 && tail.length === 3 && (separators > 1 || digitsAndSeparators.slice(0, cut) !== "0");
  const integer: string = cut < 0 || grouping ? digitsAndSeparators : digitsAndSeparators.slice(0, cut);
  const fraction: string = cut < 0 || grouping ? "" : tail;

  const value: number = Number(`${integer.replace(/[.,]/g, "")}.${fraction || "0"}`);
  return Number.isFinite(value) ? {value, sign, digits: fraction.length} : null;
}
