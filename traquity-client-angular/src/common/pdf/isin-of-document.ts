import {PdfDocument} from "./pdf-document.type";
import {undecorated} from "./undecorated";

/**
 * Two letters for the country, nine alphanumeric characters for the national number, one check digit — the shape
 * ISO 6166 gives an ISIN, and the whole of what is checked here.
 */
const ISIN: RegExp = /^[A-Z]{2}[0-9A-Z]{9}[0-9]$/;

/**
 * The security a document names, read off the words it prints.
 *
 * A page carrying **exactly one** ISIN names one security. A page carrying none and a page carrying several both
 * yield nothing: which of two an extraction belongs to is a question this cannot answer, and answering it wrongly
 * attaches a transaction to the wrong security.
 *
 * The check digit is not verified, so a word of the right shape that is no ISIN counts as one. What that costs is
 * bounded by the rule above — a false candidate beside the real one yields nothing at all instead of the wrong
 * security.
 *
 * @returns the ISIN, or `undefined` where the document names none or more than one
 */
export function isinOfDocument(document: PdfDocument): string | undefined {
  const candidates: Set<string> = new Set();

  for (const page of document.pages) {
    for (const row of page.rows) {
      for (const cell of row.cells) {
        for (const word of cell.text.split(/\s+/)) {
          const candidate: string = undecorated(word);
          if (ISIN.test(candidate)) {
            candidates.add(candidate);
          }
        }
      }
    }
  }

  return candidates.size === 1 ? [...candidates][0] : undefined;
}
