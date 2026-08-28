import {cellsOf} from "./cells-of-document";
import {PdfDocument} from "./pdf-document.type";
import {undecorated} from "./undecorated";
import {wordsOf} from "./words-of-text";

/**
 * Two letters for the country, nine alphanumeric characters for the national number, one check digit — the shape
 * ISO 6166 gives an ISIN, and the whole of what is checked here.
 */
const ISIN: RegExp = /^[A-Z]{2}[0-9A-Z]{9}[0-9]$/;

/**
 * The security a document names, read off the words it prints.
 *
 * A page carrying **exactly one** ISIN names one security. A page carrying none and a page carrying several both
 * yield nothing, since the shape alone cannot say which of several a page is about.
 *
 * The check digit is not verified, so a word of the right shape that is no ISIN counts as a candidate. The rule
 * above bounds that: a false candidate beside a real one yields nothing at all.
 *
 * @returns the ISIN, or `undefined` where the document names none or more than one
 */
export function isinOfDocument(document: PdfDocument): string | undefined {
  const candidates: Set<string> = new Set();

  for (const cell of cellsOf(document)) {
    for (const word of wordsOf(cell.text)) {
      const candidate: string = undecorated(word);
      if (ISIN.test(candidate)) {
        candidates.add(candidate);
      }
    }
  }

  return candidates.size === 1 ? [...candidates][0] : undefined;
}
