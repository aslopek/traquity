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
  return {y: 429, cells: classifyCells(cells)};
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

  it("appends no value section without the table option", (): void => {
    expect(renderPdfDocument(document)).not.toContain(VALUES_HEADING);
  });

  describe("the value table", (): void => {

    it("pairs a label in the cell to the left with its value", (): void => {
      expect(renderPdfDocument(document, {table: true}))
        .toBe("Zahlbarkeitstag  |  02.01.2025\nKurswert  |  1.005,00 EUR"
          + `\n\n${VALUES_HEADING}\nZahlbarkeitstag: 2025-01-02\nKurswert: 1005.00 EUR`);
    });

    it("pairs a label standing in front of the value in its own cell", (): void => {
      document = {pages: [pageOf([rowOf(["Ausmachender Betrag 1.681,92"])])]};
      expect(renderPdfDocument(document, {table: true})).toContain("\nAusmachender Betrag: 1681.92");
    });

    it("drops the trailing colon of a label", (): void => {
      document = {pages: [pageOf([rowOf(["Valuta:", "02.01.2025"])])]};
      expect(renderPdfDocument(document, {table: true})).toContain("\nValuta: 2025-01-02");
    });

    it("keeps the printed number of decimals", (): void => {
      document = {pages: [pageOf([rowOf(["Devisenkurs", "2.4181"])])]};
      expect(renderPdfDocument(document, {table: true})).toContain("\nDevisenkurs: 2.4181");
    });

    it("drops the booking sign, since the transaction type carries the direction", (): void => {
      document = {pages: [pageOf([rowOf(["Provision", "10,00-"])])]};
      expect(renderPdfDocument(document, {table: true})).toContain("\nProvision: 10.00");
    });

    it("lists a pair once, however often the document prints it", (): void => {
      const row: PdfRow = rowOf(["Provision", "10,00"]);
      document = {pages: [pageOf([row, rowOf(["Provision", "10,00"])])]};
      expect(renderPdfDocument(document, {table: true}).split("Provision: 10.00")).toHaveLength(2);
    });

    it("pairs nothing where the label carries digits of its own, which reads as a sentence", (): void => {
      document = {pages: [pageOf([rowOf(["Kurs 44,40 pro Stueck", "1.005,00"])])]};
      expect(renderPdfDocument(document, {table: true})).not.toContain("pro Stueck:");
    });

    it("pairs nothing where the value does not close its cell", (): void => {
      document = {pages: [pageOf([rowOf(["Bestand", "42 Stueck zum Stichtag"])])]};
      expect(renderPdfDocument(document, {table: true})).not.toContain("Bestand: 42");
    });

    it("pairs a value that closes its cell's tokens where a currency follows it", (): void => {
      document = {pages: [pageOf([rowOf(["Kurswert", "1.005,00 EUR"])])]};
      expect(renderPdfDocument(document, {table: true})).toContain("\nKurswert: 1005.00 EUR");
    });

    it("emits the heading and no pairs where the page states none", (): void => {
      document = {pages: [pageOf([rowOf(["Wertpapierabrechnung"])])]};
      expect(renderPdfDocument(document, {table: true})).toBe(`Wertpapierabrechnung\n\n${VALUES_HEADING}\n`);
    });
  });
});
