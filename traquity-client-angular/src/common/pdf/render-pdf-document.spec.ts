import {beforeEach, describe, expect, it} from "@jest/globals";
import {classifyCells} from "./classify-cells";
import {PdfCellBox, PdfDocument, PdfPage, PdfRow} from "./pdf-document.type";
import {renderPdfDocument} from "./render-pdf-document";

/**
 * Rows are built through `classifyCells`, which is the only way to obtain tokens without restating what stage 5
 * decides. That module is covered by its own spec; here it is the arrange step and never the assertion.
 */
function rowOf(texts: string[]): PdfRow {
  const cells: PdfCellBox[] = texts.map((text: string, index: number): PdfCellBox => ({
    text, x: 70.8 + index * 200, width: 120, height: 10,
  }));
  return {y: 429, cells: classifyCells(cells, "EUR")};
}

function pageOf(rows: PdfRow[], number: number = 1): PdfPage {
  return {number, width: 595, height: 842, empty: rows.length === 0, rows};
}

const VALUES_HEADING: string = "--- values read off the page ---";

describe("renderPdfDocument", (): void => {

  let document: PdfDocument;

  beforeEach((): void => {
    document = {pages: [pageOf([rowOf(["Zahlbarkeitstag", "02.01.2025"]), rowOf(["Kurswert", "1.005,00 EUR"])])]};
  });

  it("renders one line per row, with the cells of a row separated", (): void => {
    expect(renderPdfDocument(document)).toBe("Zahlbarkeitstag  |  02.01.2025\nKurswert  |  1.005,00 EUR");
  });

  it("emits no page heading for a single page", (): void => {
    expect(renderPdfDocument(document)).not.toContain("--- page");
  });

  it("emits a page heading per page where several are rendered", (): void => {
    document = {pages: [pageOf([rowOf(["first"])], 1), pageOf([rowOf(["second"])], 2)]};
    expect(renderPdfDocument(document)).toBe("--- page 1 ---\nfirst\n--- page 2 ---\nsecond");
  });

  it("renders only the pages asked for", (): void => {
    document = {pages: [pageOf([rowOf(["first"])], 1), pageOf([rowOf(["second"])], 2)]};
    expect(renderPdfDocument(document, {pages: [2]})).toBe("second");
  });
});
