import {beforeEach, describe, expect, it} from "@jest/globals";
import {cellsOf} from "./cells-of-document";
import {PdfCell, PdfDocument, PdfPage} from "./pdf-document.type";

function cellFactory(text: string): PdfCell {
  return {text, x: 70, width: 120, height: 10, tokens: []};
}

function pageFactory(number: number, rows: string[][]): PdfPage {
  return {
    number,
    width: 600,
    height: 800,
    empty: false,
    rows: rows.map((cells: string[], index: number) => ({y: index * 12, cells: cells.map(cellFactory)}))
  };
}

describe("cellsOf", (): void => {

  let document: PdfDocument;

  beforeEach((): void => {
    document = {pages: [pageFactory(1, [["Kurswert", "1.005,00"], ["Valuta", "02.01.2025"]])]};
  });

  it("states a page's cells row by row and left to right within a row", (): void => {
    expect([...cellsOf(document)].map((cell: PdfCell): string => cell.text))
      .toEqual(["Kurswert", "1.005,00", "Valuta", "02.01.2025"]);
  });

  it("states the pages in the order the document holds them", (): void => {
    document = {pages: [pageFactory(1, [["first"]]), pageFactory(2, [["second"]])]};

    expect([...cellsOf(document)].map((cell: PdfCell): string => cell.text)).toEqual(["first", "second"]);
  });

  it("states nothing for a page carrying no row", (): void => {
    document = {pages: [pageFactory(1, [])]};

    expect([...cellsOf(document)]).toEqual([]);
  });

  it("states nothing for a document carrying no page", (): void => {
    document = {pages: []};

    expect([...cellsOf(document)]).toEqual([]);
  });
});
