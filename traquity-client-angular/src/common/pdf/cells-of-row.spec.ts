import {beforeEach, describe, expect, it} from "@jest/globals";
import {cellsOfRow} from "./cells-of-row";
import {PdfCellBox, PdfRun, PdfRunRow} from "./pdf-document.type";

const HEIGHT: number = 10;
/** The thresholds are multiples of the taller run's height: 0.12 glues, 1.5 still shares a cell. */
const GLUE_GAP: number = 1;
const CELL_GAP: number = 5;
const SPLIT_GAP: number = 20;

function runFactory(overrides: Partial<PdfRun> = {}): PdfRun {
  return {text: "Limit-Orde", x: 70.8, y: 429, width: 50, height: HEIGHT, fontName: "g_d0_f1", ...overrides};
}

/** A run placed a given gap behind the one before it, so a test states the gap and nothing else. */
function after(previous: PdfRun, gap: number, overrides: Partial<PdfRun> = {}): PdfRun {
  return runFactory({x: previous.x + previous.width + gap, ...overrides});
}

function rowOf(runs: PdfRun[]): PdfRunRow {
  return {y: 429, height: Math.max(...runs.map((run: PdfRun): number => run.height)), runs};
}

describe("cellsOfRow", (): void => {

  let runs: PdfRun[];

  beforeEach((): void => {
    const first: PdfRun = runFactory();
    runs = [first, after(first, GLUE_GAP, {text: "r"})];
  });

  it("joins touching runs into one word, with no space between them", (): void => {
    expect(cellsOfRow(rowOf(runs))).toEqual([{
      text: "Limit-Order",
      x: runs[0].x,
      width: runs[1].x + runs[1].width - runs[0].x,
      height: HEIGHT,
    }] satisfies PdfCellBox[]);
  });

  it("joins runs a wider gap apart into one cell, with a space between them", (): void => {
    const first: PdfRun = runFactory({text: "Ausmachender"});
    runs = [first, after(first, CELL_GAP, {text: "Betrag"})];
    expect(cellsOfRow(rowOf(runs))[0].text).toBe("Ausmachender Betrag");
  });

  it("opens a new cell where the gap exceeds the threshold", (): void => {
    const first: PdfRun = runFactory({text: "Kurswert"});
    runs = [first, after(first, SPLIT_GAP, {text: "1.005,00"})];
    expect(cellsOfRow(rowOf(runs)).map((cell: PdfCellBox): string => cell.text)).toEqual(["Kurswert", "1.005,00"]);
  });

  it("scales the threshold to the taller run, so one page's headings and paragraphs both split correctly", (): void => {
    const first: PdfRun = runFactory({text: "Heading", height: 24});
    runs = [first, after(first, SPLIT_GAP, {text: "continued", height: 24})];
    expect(cellsOfRow(rowOf(runs))).toHaveLength(1);
  });

  it("collapses whitespace inside a joined cell", (): void => {
    const first: PdfRun = runFactory({text: "Zu  Ihren"});
    runs = [first, after(first, CELL_GAP, {text: "Gunsten "})];
    expect(cellsOfRow(rowOf(runs))[0].text).toBe("Zu Ihren Gunsten");
  });

  describe("a filler run", (): void => {

    it("is dropped from the row", (): void => {
      const first: PdfRun = runFactory({text: "Betrag"});
      runs = [first, after(first, GLUE_GAP, {text: "......."})];
      expect(cellsOfRow(rowOf(runs)).map((cell: PdfCellBox): string => cell.text)).toEqual(["Betrag"]);
    });

    it("separates the cells that stood on either side of it", (): void => {
      const first: PdfRun = runFactory({text: "Betrag"});
      const filler: PdfRun = after(first, GLUE_GAP, {text: "_______"});
      runs = [first, filler, after(filler, GLUE_GAP, {text: "EUR"})];
      expect(cellsOfRow(rowOf(runs)).map((cell: PdfCellBox): string => cell.text)).toEqual(["Betrag", "EUR"]);
    });

    it("is a run of at least three fill characters, so a decimal point is not one", (): void => {
      const first: PdfRun = runFactory({text: "Betrag"});
      runs = [first, after(first, GLUE_GAP, {text: ".."})];
      expect(cellsOfRow(rowOf(runs)).map((cell: PdfCellBox): string => cell.text)).toEqual(["Betrag.."]);
    });
  });

  it("returns no cells for a row of only filler", (): void => {
    runs = [runFactory({text: "@@@@@@@@"})];
    expect(cellsOfRow(rowOf(runs))).toEqual([]);
  });
});
