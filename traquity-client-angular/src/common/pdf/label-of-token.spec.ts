import {beforeEach, describe, expect, it} from "@jest/globals";
import {classifyCells} from "./classify-cells";
import {labelOfToken} from "./label-of-token";
import {PdfCellBox, PdfRow} from "./pdf-document.type";

function rowOf(texts: string[]): PdfRow {
  const cells: PdfCellBox[] = texts.map((text: string, index: number): PdfCellBox => ({
    text, x: 70.8 + index * 200, width: 120, height: 10
  }));
  return {y: 100, cells: classifyCells(cells, "EUR")};
}

/** The label of the row's first token, whichever cell holds it. */
function labelOfFirstToken(row: PdfRow): string | null {
  const index: number = row.cells.findIndex((cell): boolean => cell.tokens.length > 0);
  return labelOfToken(row.cells[index].tokens[0], row.cells[index], row, index);
}

describe("labelOfToken", (): void => {

  let row: PdfRow;

  beforeEach((): void => {
    row = rowOf(["Kurswert 1.005,00"]);
  });

  it("states the words in front of the value in its own cell", (): void => {
    expect(labelOfFirstToken(row)).toBe("Kurswert");
  });

  it("states the cell to the left where the value opens its own", (): void => {
    row = rowOf(["Ausmachender Betrag", "1.681,92"]);

    expect(labelOfFirstToken(row)).toBe("Ausmachender Betrag");
  });

  it("drops the colon a label is printed with", (): void => {
    row = rowOf(["Kurswert: 1.005,00"]);

    expect(labelOfFirstToken(row)).toBe("Kurswert");
  });

  it("states no label where the value opens the row", (): void => {
    row = rowOf(["1.005,00"]);

    expect(labelOfFirstToken(row)).toBeNull();
  });

  it("states no label where the cell to the left is empty", (): void => {
    row = rowOf(["", "1.005,00"]);

    expect(labelOfFirstToken(row)).toBeNull();
  });
});
