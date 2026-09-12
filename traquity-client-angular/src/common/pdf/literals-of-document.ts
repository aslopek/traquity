import {readingsOfDate} from "./parse-date";
import {ParsedNumber, readingsOfNumber} from "./parse-number";
import {PdfDocument, PdfToken} from "./pdf-document.type";

/**
 * What one document prints that a value may be lifted from. Every entry is already in the notation an answer uses,
 * so it can be stated verbatim.
 */
export type DocumentLiterals = {
  /** `yyyy-MM-dd`, whichever notation the page states them in. */
  dates: string[]
  /** `HH:mm:ss`, whichever precision the page states them to. */
  times: string[]
  /** A decimal point, no grouping separators and no booking sign. */
  numbers: string[]
};

/**
 * Everything the document states, read off the tokens stage 5 recognised and stated in the answer's notation.
 *
 * A page prints its figures and its dates in its own notation, and both readings of a word that is genuinely
 * ambiguous are stated here — `1.005` is a thousand and five to one reader and a fraction to another, and `03/04`
 * is two days of the calendar. Which of them a document means is a question about the document; this states what it
 * could say, and nothing about which of the two it does.
 *
 * Each list holds every entry once, in the order the document prints them.
 */
export function literalsOfDocument(document: PdfDocument): DocumentLiterals {
  const dates: Set<string> = new Set();
  const times: Set<string> = new Set();
  const numbers: Set<string> = new Set();

  for (const token of tokensOf(document)) {
    if (token.date != null) {
      readingsOfDate(token.text).forEach((date: string): Set<string> => dates.add(date));
    }
    if (token.time != null) {
      times.add(token.time);
    }
    if (token.magnitude != null) {
      readingsOfNumber(token.text).forEach((number: ParsedNumber): Set<string> => numbers.add(decimalOf(number)));
    }
  }

  return {dates: [...dates], times: [...times], numbers: [...numbers]};
}

/** Every token of the document, in the order the pages print them. */
function* tokensOf(document: PdfDocument): Generator<PdfToken> {
  for (const page of document.pages) {
    for (const row of page.rows) {
      for (const cell of row.cells) {
        yield* cell.tokens;
      }
    }
  }
}

/** A reading as the answer's notation writes it: the magnitude to the decimals the page printed, and no sign. */
function decimalOf(number: ParsedNumber): string {
  return number.magnitude.toFixed(number.digits);
}
