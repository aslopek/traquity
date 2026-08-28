/**
 * The geometric model of a PDF: pages, rows in reading order, cells left to right, each cell keeping the
 * coordinates it was read at.
 */

/** One text run, with the y axis flipped so that a smaller number is higher on the page. */
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

/** The signs of a number. */
export type PdfNumberSign = "-" | "+";

export type PdfToken = {
  /**
   * The word as printed, or the words a date spelling its month out is printed across. A sign or an `AM`/`PM`
   * printed as a word of its own is reported in `sign` and `time` and is not part of it.
   */
  text: string
  /**
   * The words in front of this token inside its own cell, without the sign and the currency printed with it, or
   * `null` when nothing else precedes it there.
   */
  label: string | null
  /** Whether this token is the last word of its cell, counting the sign or `AM`/`PM` printed behind it as its own. */
  last: boolean
  /** The magnitude, with no thousands separators and with any booking sign removed. */
  magnitude?: number
  /** Digits printed after the decimal separator, so the magnitude can be rendered as it was printed. */
  digits?: number
  sign?: PdfNumberSign
  /**
   * The currency the amount is denoted in, present where its code is printed on either side of the amount — in
   * this cell or in a neighbouring one — and absent for an amount printed in any other currency.
   */
  currency?: string
  /** `yyyy-MM-dd`. */
  date?: string
  /** `HH:mm:ss` on the 24-hour clock, a time printed without seconds reading on the full minute. */
  time?: string
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
