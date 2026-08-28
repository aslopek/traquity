import {isinOfDocument} from "./isin-of-document";
import {PdfDocument} from "./pdf-document.type";
import {renderPdfDocument} from "./render-pdf-document";
import {DocumentToken, tokensOfDocument} from "./tokens-of-document";

/** Everything a document parsed as transaction contains. */
export type PdfTransactionReading = {
  /** One line per printed row. */
  text: string
  /** Every value the page states, normalized. */
  tokens: DocumentToken[]
  /** The security the page names, absent where it names none or more than one. */
  isin: string | undefined
};

/**
 * One document read three ways at once, produced together so the three parts always describe the same document.
 */
export function transactionReadingOfDocument(document: PdfDocument): PdfTransactionReading {
  return {
    text: renderPdfDocument(document),
    tokens: tokensOfDocument(document),
    isin: isinOfDocument(document)
  };
}
