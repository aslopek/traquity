import {PdfCellBox, PdfRun, PdfRunRow} from "./pdf-document.type";

/** Gap below which two runs on one baseline are one word, joined with no space between them. */
const GLUE: number = 0.12;
/** Gap below which two runs on one baseline are one cell, joined with a single space. */
const CELL: number = 1.5;

/**
 * A rule, a leader or a fill drawn as text and not as a line — `@@@@…` across the top of a page, the underscores
 * padding a currency column, a row of dots leading to a page number. It carries nothing, and keeping it would glue
 * the cells on either side of it into one.
 */
const FILLER: RegExp = /^[@_\-=.·•*~]{3,}$/;

/**
 * Stages 2 and 4 — one row's runs become cells, and runs whose boxes touch become one word inside a cell.
 *
 * Both thresholds are multiples of the taller run's height, so the split is a property of the type being read and
 * not of a page-wide column grid: a row that right-aligns a tax block at one x while the rest of the page aligns
 * at another still splits correctly. A filler run is dropped and separates whatever stood on either side of it.
 */
export function cellsOfRow(row: PdfRunRow): PdfCellBox[] {
  const cells: PdfCellBox[] = [];
  let broken: boolean = false;

  for (const run of row.runs) {
    if (FILLER.test(run.text.trim())) {
      broken = true;
      continue;
    }

    const cell: PdfCellBox | undefined = broken ? undefined : cells[cells.length - 1];
    broken = false;

    if (cell != null) {
      const gap: number = run.x - (cell.x + cell.width);
      const scale: number = Math.max(run.height, cell.height);
      if (gap <= CELL * scale) {
        cell.text += (gap <= GLUE * scale ? "" : " ") + run.text;
        cell.width = run.x + run.width - cell.x;
        cell.height = Math.max(cell.height, run.height);
        continue;
      }
    }

    cells.push(boxOf(run));
  }

  return cells.map((cell: PdfCellBox): PdfCellBox => ({...cell, text: cell.text.replace(/\s+/g, " ").trim()}));
}

function boxOf(run: PdfRun): PdfCellBox {
  return {text: run.text, x: run.x, width: run.width, height: run.height};
}
