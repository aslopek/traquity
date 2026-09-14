import {PdfCell, PdfDocument} from "./pdf-document.type";

/**
 * Every cell of a document, in the order its pages print them: page by page, row by row, and left to right within
 * a row.
 */
export function* cellsOf(document: PdfDocument): Generator<PdfCell> {
  for (const page of document.pages) {
    for (const row of page.rows) {
      yield* row.cells;
    }
  }
}
