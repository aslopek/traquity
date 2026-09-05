import {beforeEach, describe, expect, it} from "@jest/globals";
import {PdfRun, PdfRunRow} from "./pdf-document.type";
import {rowsOfRuns} from "./rows-of-runs";

function runFactory(overrides: Partial<PdfRun> = {}): PdfRun {
  return {text: "Zahlbarkeitstag", x: 70.8, y: 429, width: 60, height: 10, fontName: "g_d0_f1", ...overrides};
}

/** The prototype's tolerance is 0.45 of the taller run's height, so 4.5 separates rows at this size. */
const WITHIN_TOLERANCE: number = 4;
const BEYOND_TOLERANCE: number = 5;

describe("rowsOfRuns", (): void => {

  let runs: PdfRun[];

  beforeEach((): void => {
    runs = [runFactory(), runFactory({text: "02.01.2025", x: 198.3})];
  });

  it("puts two runs on one baseline into one row", (): void => {
    expect(rowsOfRuns(runs)).toEqual([{y: 429, height: 10, runs}] satisfies PdfRunRow[]);
  });

  it("keeps a run within the tolerance of the row's baseline in that row", (): void => {
    runs = [runFactory(), runFactory({text: "02.01.2025", x: 198.3, y: 429 + WITHIN_TOLERANCE})];
    expect(rowsOfRuns(runs)).toHaveLength(1);
  });

  it("opens a new row for a run beyond the tolerance", (): void => {
    runs = [runFactory(), runFactory({text: "Bestandsstichtag", y: 429 + BEYOND_TOLERANCE})];
    expect(rowsOfRuns(runs).map((row: PdfRunRow): number => row.y)).toEqual([429, 429 + BEYOND_TOLERANCE]);
  });

  it("scales the tolerance to the taller of the two runs", (): void => {
    runs = [runFactory({height: 20}), runFactory({text: "heading", y: 429 + BEYOND_TOLERANCE})];
    expect(rowsOfRuns(runs)).toHaveLength(1);
  });

  it("carries the tallest run's height on the row, since every gap is measured against it", (): void => {
    runs = [runFactory(), runFactory({text: "heading", x: 198.3, height: 14})];
    expect(rowsOfRuns(runs)[0].height).toBe(14);
  });

  it("orders a row's runs left to right", (): void => {
    runs = [runFactory({text: "right", x: 300}), runFactory({text: "left", x: 70.8})];
    expect(rowsOfRuns(runs)[0].runs.map((run: PdfRun): string => run.text)).toEqual(["left", "right"]);
  });

  it("measures every run against the row's own baseline, so drift does not accumulate into one row", (): void => {
    runs = [
      runFactory({y: 429}),
      runFactory({text: "drifted", y: 429 + WITHIN_TOLERANCE}),
      runFactory({text: "drifted further", y: 429 + 2 * WITHIN_TOLERANCE}),
    ];
    expect(rowsOfRuns(runs).map((row: PdfRunRow): number => row.y)).toEqual([429, 429 + 2 * WITHIN_TOLERANCE]);
  });

  it("returns no rows for no runs", (): void => {
    runs = [];
    expect(rowsOfRuns(runs)).toEqual([]);
  });
});
