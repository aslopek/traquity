import {getDocument} from "pdfjs-dist";
import {cellsOfRow} from "./cells-of-row";
import {classifyCells} from "./classify-cells";
import {PdfDocument, PdfPage, PdfRow, PdfRun, PdfRunRow} from "./pdf-document.type";
import {rowsOfRuns} from "./rows-of-runs";
import {PdfTextItem, runsOfTextContent} from "./runs-of-text-content";

/**
 * Why a document produced no model. Each case is distinguishable without reading a message, so a caller can put
 * its own wording on it.
 *
 * `notAPdf` is decided from the bytes alone; `unreadable` is pdf.js refusing a file that does carry the header,
 * an encrypted one included.
 */
export type PdfExtractionFailure =
  | { reason: "notAPdf" }
  | { reason: "unreadable", message: string }
  | { reason: "noTextLayer" }
  | { reason: "tooManyPages", pages: number, maximum: number }
  | { reason: "tooManyRuns", maximum: number }
  | { reason: "outOfTime", milliseconds: number };

export type PdfExtractionResult =
  | { status: "extracted", document: PdfDocument }
  | { status: "failed", failure: PdfExtractionFailure };

/**
 * The bounds a parse runs under. They exist because this runs in the renderer: a document that never finishes
 * parsing would otherwise keep the window busy for as long as it takes.
 */
export type PdfExtractionBounds = {
  maximumPages: number
  /** Counted across the whole document, since a single page can carry a run per glyph. */
  maximumRuns: number
  milliseconds: number
  /** Elapsed-time source, so the budget is assertable without waiting for it. */
  now: () => number
};

export const DEFAULT_PDF_EXTRACTION_BOUNDS: PdfExtractionBounds = {
  maximumPages: 50,
  maximumRuns: 200_000,
  milliseconds: 30_000,
  now: (): number => Date.now(),
};

/** How far into the file the header may start, since a producer may prepend bytes before it. */
const HEADER_SEARCH_LENGTH: number = 1024;
const HEADER: string = "%PDF-";

/**
 * The geometric model of a PDF, through ADR-009's five stages: runs, joined runs, rows by baseline, cells by gap,
 * and what each cell's words are.
 *
 * Parsing runs on the worker pdf.js is configured with, so a document that spins the parser occupies that worker
 * and not the window. The time budget is checked between pages, which bounds the document and not a single page's
 * parse.
 *
 * **On `isEvalSupported`:** pdf.js 6 no longer offers that option, because the code path it guarded is gone —
 * neither `build/pdf.mjs` nor `build/pdf.worker.mjs` contains an `eval(` or a `new Function(`. Passing it would be
 * a silent no-op that reads as a protection. The application's own `script-src 'self'` grants no `unsafe-eval`
 * either, so the guarantee holds from two directions and from neither a flag.
 *
 * @param bytes the file's contents.
 * @returns the model, or the one reason it could not be produced.
 */
export async function extractPdf(
  bytes: ArrayBuffer,
  bounds: PdfExtractionBounds = DEFAULT_PDF_EXTRACTION_BOUNDS,
): Promise<PdfExtractionResult> {
  if (!hasPdfHeader(bytes)) {
    return {status: "failed", failure: {reason: "notAPdf"}};
  }

  const startedAt: number = bounds.now();
  const loadingTask: ReturnType<typeof getDocument> = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  });

  try {
    const pdf: Awaited<typeof loadingTask.promise> = await loadingTask.promise;
    if (pdf.numPages > bounds.maximumPages) {
      return {status: "failed", failure: {reason: "tooManyPages", pages: pdf.numPages, maximum: bounds.maximumPages}};
    }

    const pages: PdfPage[] = [];
    let runCount: number = 0;

    for (let number: number = 1; number <= pdf.numPages; number++) {
      if (bounds.now() - startedAt > bounds.milliseconds) {
        return {status: "failed", failure: {reason: "outOfTime", milliseconds: bounds.milliseconds}};
      }

      const page: Awaited<ReturnType<typeof pdf.getPage>> = await pdf.getPage(number);
      const {width, height} = page.getViewport({scale: 1});
      const runs: PdfRun[] = runsOfTextContent(textItemsOf(await page.getTextContent()), height);

      runCount += runs.length;
      if (runCount > bounds.maximumRuns) {
        return {status: "failed", failure: {reason: "tooManyRuns", maximum: bounds.maximumRuns}};
      }

      pages.push({number, width, height, empty: runs.length === 0, rows: rowsOf(runs)});
    }

    if (pages.every((page: PdfPage): boolean => page.empty)) {
      return {status: "failed", failure: {reason: "noTextLayer"}};
    }
    return {status: "extracted", document: {pages}};
  } catch (error: unknown) {
    return {status: "failed", failure: {reason: "unreadable", message: messageOf(error)}};
  } finally {
    await loadingTask.destroy();
  }
}

function rowsOf(runs: PdfRun[]): PdfRow[] {
  return rowsOfRuns(runs).map((row: PdfRunRow): PdfRow => ({
    y: Number(row.y.toFixed(2)),
    cells: classifyCells(cellsOfRow(row)),
  }));
}

function hasPdfHeader(bytes: ArrayBuffer): boolean {
  const head: Uint8Array = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, HEADER_SEARCH_LENGTH));
  return String.fromCharCode(...head).includes(HEADER);
}

/**
 * Marked-content entries carry no text and appear only where pdf.js is asked for them, so anything without a `str`
 * is dropped here instead of being handled downstream.
 */
function textItemsOf(content: { items: unknown[] }): PdfTextItem[] {
  return content.items.filter((item: unknown): item is PdfTextItem => typeof (item as PdfTextItem).str === "string");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
