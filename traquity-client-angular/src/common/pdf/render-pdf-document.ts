import {PdfCell, PdfDocument, PdfPage} from "./pdf-document.type";

export type RenderPdfDocumentOptions = {
  /** Page numbers to render, or `null` for all of them. */
  pages?: number[] | null
};

/**
 * One line per printed row, cells separated by ` | `, so a label and the value on its baseline stay adjacent. A page
 * heading is emitted only where more than one page is rendered.
 */
export function renderPdfDocument(document: PdfDocument, options: RenderPdfDocumentOptions = {}): string {
  const {pages = null} = options;
  const wanted: PdfPage[] = document.pages
    .filter((page: PdfPage): boolean => pages == null || pages.includes(page.number));

  const lines: string[] = [];
  for (const page of wanted) {
    if (wanted.length > 1) {
      lines.push(`--- page ${page.number} ---`);
    }
    for (const row of page.rows) {
      lines.push(row.cells.map((cell: PdfCell): string => cell.text).join("  |  "));
    }
  }

  return lines.join("\n").trim();
}
