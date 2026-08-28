import {isinOfDocument} from "./isin-of-document";
import {PdfDocument} from "./pdf-document.type";
import {renderPdfDocument} from "./render-pdf-document";
import {DocumentToken, tokensOfDocument} from "./tokens-of-document";

/** Everything one parsed document says. */
export type PdfReading = {
  /** One line per printed row. */
  text: string
  /** Every value the page states, normalized. */
  tokens: DocumentToken[]
  /** The security the page names, absent where it names none or more than one. */
  isin: string | undefined
};

/**
 * One document read three ways at once. The three are produced together because a reading whose parts came from two
 * documents describes neither.
 */
export function readingOfDocument(document: PdfDocument): PdfReading {
  return {
    text: renderPdfDocument(document),
    tokens: tokensOfDocument(document),
    isin: isinOfDocument(document)
  };
}
