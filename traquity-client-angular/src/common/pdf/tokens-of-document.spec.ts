import {beforeEach, describe, expect, it} from "@jest/globals";
import {classifyCells} from "./classify-cells";
import {PdfCellBox, PdfDocument, PdfRow} from "./pdf-document.type";
import {DocumentToken, tokensOfDocument} from "./tokens-of-document";

function rowOf(texts: string[]): PdfRow {
  const cells: PdfCellBox[] = texts.map((text: string, index: number): PdfCellBox => ({
    text, x: 70.8 + index * 200, width: 120, height: 10
  }));
  return {y: 100, cells: classifyCells(cells, "EUR")};
}

function documentOf(rows: PdfRow[]): PdfDocument {
  return {pages: [{number: 1, width: 600, height: 800, empty: false, rows}]};
}

describe("tokensOfDocument", (): void => {

  let document: PdfDocument;

  beforeEach((): void => {
    document = documentOf([rowOf(["Kurswert 1.005,00 EUR"])]);
  });

  it("states an amount with its label, its currency and its printed text", (): void => {
    expect(tokensOfDocument(document)).toEqual([
      {id: 1, kind: "number", text: "1.005,00", value: "1005.00", label: "Kurswert", currency: "EUR"}
    ] satisfies DocumentToken[]);
  });

  it("keeps the decimals the page printed", (): void => {
    document = documentOf([rowOf(["Stueck 0,55814"])]);

    expect(tokensOfDocument(document)[0].value).toBe("0.55814");
  });

  it("states no currency where the page denotes the amount in none", (): void => {
    document = documentOf([rowOf(["Stueck 42"])]);

    expect(tokensOfDocument(document)).toEqual([
      {id: 1, kind: "number", text: "42", value: "42", label: "Stueck"}
    ] satisfies DocumentToken[]);
  });

  it("states a date in the notation an answer uses", (): void => {
    document = documentOf([rowOf(["Zahlbarkeitstag 02.01.2025"])]);

    expect(tokensOfDocument(document)).toEqual([
      {id: 1, kind: "date", text: "02.01.2025", value: "2025-01-02", label: "Zahlbarkeitstag"}
    ] satisfies DocumentToken[]);
  });

  it("states a time on the 24-hour clock", (): void => {
    document = documentOf([rowOf(["Handelszeit 4:30 PM"])]);

    expect(tokensOfDocument(document)).toEqual([
      {id: 1, kind: "time", text: "4:30", value: "16:30:00", label: "Handelszeit"}
    ] satisfies DocumentToken[]);
  });

  it("takes the label from the cell to the left where the value opens its own", (): void => {
    document = documentOf([rowOf(["Ausmachender Betrag", "1.681,92"])]);

    expect(tokensOfDocument(document)[0].label).toBe("Ausmachender Betrag");
  });

  it("states no label where nothing names the value", (): void => {
    document = documentOf([rowOf(["1.005,00"])]);

    expect(tokensOfDocument(document)[0].label).toBeNull();
  });

  it("keeps a label carrying a digit, which names a value like any other", (): void => {
    document = documentOf([rowOf(["Steuer 2024 25,32"])]);

    expect(tokensOfDocument(document)).toEqual([
      {id: 1, kind: "number", text: "2024", value: "2024", label: "Steuer"},
      {id: 2, kind: "number", text: "25,32", value: "25.32", label: "Steuer 2024"}
    ] satisfies DocumentToken[]);
  });

  it("numbers the tokens from one, in the order the page states them", (): void => {
    document = documentOf([rowOf(["Valuta 02.01.2025", "Kurswert 1.005,00"])]);

    expect(tokensOfDocument(document).map((token: DocumentToken): number => token.id)).toEqual([1, 2]);
  });

  it("states the tokens of every row", (): void => {
    document = documentOf([rowOf(["Stueck 42"]), rowOf(["Kurswert 1.005,00"])]);

    expect(tokensOfDocument(document).map((token: DocumentToken): string => token.value)).toEqual(["42", "1005.00"]);
  });

  it("states nothing for a page whose words carry no value", (): void => {
    document = documentOf([rowOf(["Wertpapierabrechnung Kauf"])]);

    expect(tokensOfDocument(document)).toEqual([]);
  });

  it("states nothing for a document of no pages", (): void => {
    document = {pages: []};

    expect(tokensOfDocument(document)).toEqual([]);
  });
});
