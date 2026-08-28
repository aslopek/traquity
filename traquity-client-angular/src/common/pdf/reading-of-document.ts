import {isinOfDocument} from "./isin-of-document";
import {DocumentLiterals, literalsOfDocument} from "./literals-of-document";
import {PdfDocument} from "./pdf-document.type";
import {renderPdfDocument} from "./render-pdf-document";

/** Everything one parsed document says, read off it in one pass. */
export type PdfReading = {
  /** The page as a language model reads it: one line per printed row, with the values read off it appended. */
  text: string
  /** Every value the page states, in the notation an answer uses. */
  literals: DocumentLiterals
  /** The security the page names, absent where it names none or more than one. */
  isin: string | undefined
};

/**
 * One document read three ways at once — as text, as the values it states, and as the security it names.
 *
 * The three belong together and are produced together for that reason: the values are what an answer may be built
 * from and the text is what that answer is chosen against, so a reading whose halves came from two different
 * documents describes neither. Composing them here makes them one document's by construction, where a caller
 * assembling them itself has to keep them so.
 */
export function readingOfDocument(document: PdfDocument): PdfReading {
  return {
    text: renderPdfDocument(document, {table: true}),
    literals: literalsOfDocument(document),
    isin: isinOfDocument(document)
  };
}
