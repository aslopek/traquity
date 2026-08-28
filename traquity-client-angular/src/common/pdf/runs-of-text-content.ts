import {PdfRun} from "./pdf-document.type";

/**
 * The part of a pdf.js text item this stage reads. Declared here as its own minimal type, so the stage depends on
 * the four fields it uses and a hand-built test item is assignable without a cast.
 */
export type PdfTextItem = {
  str: string
  /** The item's transform matrix: `[3]` is the vertical scale, `[4]` the left edge and `[5]` the baseline. */
  transform: number[]
  width: number
  height: number
  fontName: string
};

/** The height assumed for a run whose font reports none, so a gap is never measured against zero. */
const FALLBACK_HEIGHT: number = 8;

/**
 * Stage 1 — the text runs of one page, in reading order.
 *
 * The y axis is flipped against the page height, so a smaller `y` is higher on the page and rows sort naturally.
 * Whitespace-only items carry nothing and are dropped. A run's own `height` is `0` under some fonts, in which case
 * the transform's vertical scale is the reliable size.
 */
export function runsOfTextContent(items: PdfTextItem[], pageHeight: number): PdfRun[] {
  return items
    .filter((item: PdfTextItem): boolean => item.str.trim() !== "")
    .map((item: PdfTextItem): PdfRun => ({
      text: item.str,
      x: item.transform[4],
      y: pageHeight - item.transform[5],
      width: item.width,
      height: item.height || Math.abs(item.transform[3]) || FALLBACK_HEIGHT,
      fontName: item.fontName,
    }))
    .sort((a: PdfRun, b: PdfRun): number => a.y - b.y || a.x - b.x);
}
