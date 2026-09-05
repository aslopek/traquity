/**
 * The geometric model of a PDF: pages, rows in reading order, cells left to right, each cell keeping the
 * coordinates it was read at. Nothing here is flattened onto a page-wide row or column grid, so a label and its
 * value are adjacent exactly when the printer put them on one baseline.
 */

/** One text run as the PDF prints it, with the y axis flipped so that a smaller number is higher on the page. */
export type PdfRun = {
  text: string
  /** Left edge, in PDF user space units. */
  x: number
  /** Distance from the top of the page, so a smaller number is higher. */
  y: number
  width: number
  height: number
  fontName: string
};

/** Runs sharing one baseline, before they are split into cells. */
export type PdfRunRow = {
  y: number
  /** The tallest run on this baseline, which is the scale every gap on it is measured against. */
  height: number
  runs: PdfRun[]
};

/** A cell before stage 5 has said anything about its content. */
export type PdfCellBox = {
  text: string
  x: number
  width: number
  height: number
};

/** The direction of a booking, as a German settlement prints it behind the amount. */
export type PdfNumberSign = "-" | "+";

/**
 * What one word of a cell turned out to be. A token exists only for a word that is a number, a date or a time;
 * everything else in the cell stays plain text.
 */
export type PdfToken = {
  text: string
  /** The words in front of this token inside its own cell, or `null` when it opens the cell. */
  label: string | null
  /** The magnitude, with no thousands separators and with any trailing booking sign removed. */
  number?: number
  /** Digits printed after the decimal separator, so the magnitude can be rendered as it was printed. */
  digits?: number
  sign?: PdfNumberSign
  /** Three upper-case letters, taken from this cell or from the one to its right. */
  currency?: string
  /** `yyyy-MM-dd`. */
  date?: string
  /** `HH:mm:ss`, exactly as printed. */
  time?: string
  /** Whether this token is the last word of its cell. */
  last: boolean
};

export type PdfCell = PdfCellBox & {
  tokens: PdfToken[]
};

export type PdfRow = {
  y: number
  cells: PdfCell[]
};

export type PdfPage = {
  number: number
  width: number
  height: number
  /**
   * True when the page's text layer holds no runs at all. It is reported instead of an empty row list so a
   * document that carries no text can be refused with that as the reason.
   */
  empty: boolean
  rows: PdfRow[]
};

export type PdfDocument = {
  pages: PdfPage[]
};
