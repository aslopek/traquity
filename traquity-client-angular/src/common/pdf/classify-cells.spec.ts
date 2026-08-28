import {beforeEach, describe, expect, it} from "@jest/globals";
import {classifyCells} from "./classify-cells";
import {PdfCell, PdfCellBox, PdfToken} from "./pdf-document.type";

function cellFactory(overrides: Partial<PdfCellBox> = {}): PdfCellBox {
  return {text: "Kurswert 1.005,00", x: 70.8, width: 120, height: 10, ...overrides};
}

function tokensOf(cells: PdfCell[], index: number = 0): PdfToken[] {
  return cells[index].tokens;
}

describe("classifyCells", (): void => {

  let cells: PdfCellBox[];

  beforeEach((): void => {
    cells = [cellFactory()];
  });

  it("reads a number and the words in front of it as its label", (): void => {
    expect(classifyCells(cells)).toEqual([{
      ...cells[0],
      tokens: [{text: "1.005,00", label: "Kurswert", number: 1005, digits: 2, last: true}],
    }] satisfies PdfCell[]);
  });

  it("reports no label for a token opening its cell", (): void => {
    cells = [cellFactory({text: "1.005,00"})];
    expect(tokensOf(classifyCells(cells))[0].label).toBeNull();
  });

  it("produces no token for a cell of plain text", (): void => {
    cells = [cellFactory({text: "Ausmachender Betrag"})];
    expect(tokensOf(classifyCells(cells))).toEqual([]);
  });

  it("marks a token that does not close its cell", (): void => {
    cells = [cellFactory({text: "Kurs 44,40 pro Stueck"})];
    expect(tokensOf(classifyCells(cells))[0].last).toBe(false);
  });

  it("reports the booking direction printed behind an amount", (): void => {
    cells = [cellFactory({text: "Provision 10,00-"})];
    expect(tokensOf(classifyCells(cells))[0]).toEqual({
      text: "10,00-", label: "Provision", number: 10, digits: 2, sign: "-", last: true,
    } satisfies PdfToken);
  });

  it("reads a date", (): void => {
    cells = [cellFactory({text: "Zahlbarkeitstag 02.01.2025"})];
    expect(tokensOf(classifyCells(cells))[0]).toEqual({
      text: "02.01.2025", label: "Zahlbarkeitstag", date: "2025-01-02", last: true,
    } satisfies PdfToken);
  });

  it("reads a time as printed", (): void => {
    cells = [cellFactory({text: "Handelszeit 14:05:00"})];
    expect(tokensOf(classifyCells(cells))[0]).toEqual({
      text: "14:05:00", label: "Handelszeit", time: "14:05:00", last: true,
    } satisfies PdfToken);
  });

  it("produces a token per number in a cell", (): void => {
    cells = [cellFactory({text: "Stueck 42 zu 23,95"})];
    expect(tokensOf(classifyCells(cells)).map((token: PdfToken): string => token.text)).toEqual(["42", "23,95"]);
  });

  describe("currency", (): void => {

    it("is taken from the word behind the amount in the same cell", (): void => {
      cells = [cellFactory({text: "Kurswert 1.005,00 EUR"})];
      expect(tokensOf(classifyCells(cells))[0].currency).toBe("EUR");
    });

    it("is taken from the next cell where the amount closes its own", (): void => {
      cells = [cellFactory({text: "Provision 10,00-"}), cellFactory({text: "EUR", x: 400})];
      expect(tokensOf(classifyCells(cells))[0].currency).toBe("EUR");
    });

    it("is not taken from a word that is not a three-letter code", (): void => {
      cells = [cellFactory({text: "Kurswert 1.005,00 Euro"})];
      expect(tokensOf(classifyCells(cells))[0].currency).toBeUndefined();
    });

    it("is not attached to a date", (): void => {
      cells = [cellFactory({text: "Valuta 02.01.2025 EUR"})];
      expect(tokensOf(classifyCells(cells))[0].currency).toBeUndefined();
    });
  });
});
