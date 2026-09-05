import {PdfRun, PdfRunRow} from "./pdf-document.type";

/**
 * Vertical distance below which two runs share a baseline, as a fraction of the taller one's height. A fraction
 * and not a fixed epsilon: one broker prints a row exact to the hundredth while another puts `44.40` and `44.70`
 * in one visual row, and the same fraction serves an 8pt paragraph and a 12pt heading on the same page.
 */
const ROW: number = 0.45;

/**
 * Stage 3 — runs whose baselines lie within `ROW` of each other become one row, and each row's runs are ordered
 * left to right.
 *
 * The comparison is against the row opened last and never against a page-wide grid, which is what keeps a value
 * column that sits a little below its labels attached to those labels.
 *
 * @param runs in reading order, as stage 1 produced them.
 */
export function rowsOfRuns(runs: PdfRun[]): PdfRunRow[] {
  const rows: PdfRunRow[] = [];

  for (const run of runs) {
    const row: PdfRunRow | undefined = rows[rows.length - 1];
    if (row != null && Math.abs(run.y - row.y) <= ROW * Math.max(run.height, row.height)) {
      row.runs.push(run);
      row.height = Math.max(row.height, run.height);
      continue;
    }
    rows.push({y: run.y, height: run.height, runs: [run]});
  }

  for (const row of rows) {
    row.runs.sort((a: PdfRun, b: PdfRun): number => a.x - b.x);
  }
  return rows;
}
