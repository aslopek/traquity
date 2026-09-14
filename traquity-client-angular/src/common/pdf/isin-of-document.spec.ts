import {beforeEach, describe, expect, it} from "@jest/globals";
import {isinOfDocument} from "./isin-of-document";
import {PdfCell, PdfDocument} from "./pdf-document.type";

function cellFactory(text: string): PdfCell {
  return {text, x: 70, width: 120, height: 10, tokens: []};
}

function documentFactory(rows: string[][]): PdfDocument {
  return {
    pages: [{
      number: 1,
      width: 600,
      height: 800,
      empty: false,
      rows: rows.map((cells: string[], index: number) => ({y: index * 12, cells: cells.map(cellFactory)}))
    }]
  };
}

describe("isinOfDocument", (): void => {

  let document: PdfDocument;

  beforeEach((): void => {
    document = documentFactory([["Stück 10", "MUSTERWERKE AG", "DE000MUSTR14", "(MUSTR1)"]]);
  });

  it("reads the ISIN the page names", (): void => {
    expect(isinOfDocument(document)).toBe("DE000MUSTR14");
  });

  it("reads the one a page prints twice once, two mentions being one security", (): void => {
    document = documentFactory([["ISIN: DE000MUSTR14"], ["Wertpapierkennnummer", "DE000MUSTR14"]]);

    expect(isinOfDocument(document)).toBe("DE000MUSTR14");
  });

  it("reads it out of the brackets a page sets it in", (): void => {
    document = documentFactory([["Wertpapier (DE000MUSTR14)"]]);

    expect(isinOfDocument(document)).toBe("DE000MUSTR14");
  });

  it("reads none where the page names two securities", (): void => {
    document = documentFactory([["DE000MUSTR14", "MUSTERWERKE AG"], ["DE000ZWEIT14", "ZWEITWERK AG"]]);

    expect(isinOfDocument(document)).toBeUndefined();
  });

  it("reads none where the page names no security at all", (): void => {
    document = documentFactory([["Wertpapier Abrechnung Verkauf"]]);

    expect(isinOfDocument(document)).toBeUndefined();
  });

  it("passes over one sitting inside a longer run of letters and digits", (): void => {
    document = documentFactory([["Referenz", "XXDE000MUSTR14YY"]]);

    expect(isinOfDocument(document)).toBeUndefined();
  });

  it("passes over a word of the right length whose country is no pair of letters", (): void => {
    document = documentFactory([["Auftragsnummer", "123456789012"]]);

    expect(isinOfDocument(document)).toBeUndefined();
  });

  it("passes over a word of the right shape whose last character is no digit", (): void => {
    document = documentFactory([["Referenz", "DE000MUSTR1X"]]);

    expect(isinOfDocument(document)).toBeUndefined();
  });

  it("reads none from a document of no pages", (): void => {
    document = {pages: []};

    expect(isinOfDocument(document)).toBeUndefined();
  });
});
