import {PdfCell, PdfDocument, PdfPage, PdfRow, PdfToken} from "./pdf-document.type";

export type RenderPdfDocumentOptions = {
  /** Page numbers to render, or `null` for all of them. */
  pages?: number[] | null
  /** Whether to append the label to value pairs stage 5 recognised. */
  table?: boolean
};

/** The longest a label may be before it reads as a sentence and not as the name of a figure. */
const MAXIMUM_LABEL_LENGTH: number = 60;

/**
 * The rendering a language model reads: one line per printed row, cells separated by ` | `, so a label and the
 * value on its baseline are adjacent because the printer put them there. A page heading is emitted only where more
 * than one page is rendered.
 *
 * With `table`, the label to value pairs are appended as a second section. Amounts appear without their thousands
 * separators and without the trailing booking sign, dates as `yyyy-MM-dd`, so the notation is resolved before the
 * model sees it.
 */
export function renderPdfDocument(document: PdfDocument, options: RenderPdfDocumentOptions = {}): string {
  const {pages = null, table = false} = options;
  const wanted: PdfPage[] = document.pages
    .filter((page: PdfPage): boolean => pages == null || pages.includes(page.number));

  const lines: string[] = [];
  for (const page of wanted) {
    if (wanted.length > 1) {
      lines.push(`--- page ${page.number} ---`);
    }
    for (const row of page.rows) {
      lines.push(row.cells.map((cell: PdfCell): string => cell.text).join("  |  "));
    }
  }

  const body: string = lines.join("\n").trim();
  if (!table) {
    return body;
  }
  return `${body}\n\n--- values read off the page ---\n${pairsOf(wanted).join("\n")}`;
}

function pairsOf(pages: PdfPage[]): string[] {
  const pairs: string[] = [];
  for (const page of pages) {
    for (const row of page.rows) {
      for (const pair of pairsOfRow(row)) {
        if (!pairs.includes(pair)) {
          pairs.push(pair);
        }
      }
    }
  }
  return pairs;
}

function pairsOfRow(row: PdfRow): string[] {
  const pairs: string[] = [];
  row.cells.forEach((cell: PdfCell, index: number): void => {
    for (const token of cell.tokens) {
      const label: string = labelOf(token, cell, row, index);
      const value: string | null = valueOf(token);
      if (!isName(label) || !isFinalValue(token, cell) || value == null) {
        continue;
      }
      pairs.push(`${label}: ${value}`);
    }
  });
  return pairs;
}

/**
 * A value's label is the text in front of it **in its own cell**, or the cell to its left where the token opens
 * the cell. Never further: a row crosses column blocks that have nothing to do with each other.
 */
function labelOf(token: PdfToken, cell: PdfCell, row: PdfRow, index: number): string {
  const ownLabel: string | null = token.label ?? (cell.tokens[0] === token ? row.cells[index - 1]?.text ?? null : null);
  return (ownLabel ?? "").replace(/[:\s]+$/, "");
}

/** Whether a label names a figure. A label carrying digits of its own is a sentence, and so is a very long one. */
function isName(label: string): boolean {
  return /\p{L}{3}/u.test(label) && !/\d/.test(label) && label.length <= MAXIMUM_LABEL_LENGTH;
}

/**
 * A value whose cell continues past it is a number inside a sentence far more often than it is a labelled figure.
 * A currency behind it says otherwise, which is why a token closing its cell's token list counts as final too.
 */
function isFinalValue(token: PdfToken, cell: PdfCell): boolean {
  return token.last || (token.currency != null && cell.tokens[cell.tokens.length - 1] === token);
}

function valueOf(token: PdfToken): string | null {
  if (token.date != null) {
    return token.date;
  }
  if (token.time != null) {
    return token.time;
  }
  if (token.number == null || token.digits == null) {
    return null;
  }
  return `${token.number.toFixed(token.digits)}${token.currency != null ? ` ${token.currency}` : ""}`;
}
