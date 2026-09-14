import {labelOfToken} from "./label-of-token";
import {PdfCell, PdfDocument, PdfRow, PdfToken} from "./pdf-document.type";

export type DocumentTokenKind = "date" | "time" | "number";

/** One value a page states, normalized and kept with the text naming it. */
export type DocumentToken = {
  /** 1-based, in the order the pages print the tokens. */
  id: number
  kind: DocumentTokenKind
  /** As printed. */
  text: string
  /** `yyyy-MM-dd`, `HH:mm:ss`, or a decimal with no grouping and no sign. */
  value: string
  label: string | null
  /** Present where the page denotes the amount in the currency the caller asked for. */
  currency?: string
};

/**
 * Every value the document states, in reading order.
 *
 * A word carrying two kinds at once yields one token of each: which of them a page means is a question about the
 * page and no question the notation answers.
 */
export function tokensOfDocument(document: PdfDocument): DocumentToken[] {
  const found: Omit<DocumentToken, "id">[] = [];

  for (const page of document.pages) {
    for (const row of page.rows) {
      row.cells.forEach((cell: PdfCell, index: number): void => {
        for (const token of cell.tokens) {
          found.push(...kindsOf(token, labelOfToken(token, cell, row, index)));
        }
      });
    }
  }

  return found.map((token: Omit<DocumentToken, "id">, index: number): DocumentToken => ({id: index + 1, ...token}));
}

function kindsOf(token: PdfToken, label: string | null): Omit<DocumentToken, "id">[] {
  const kinds: Omit<DocumentToken, "id">[] = [];

  if (token.date != null) {
    kinds.push({kind: "date", text: token.text, value: token.date, label});
  }
  if (token.time != null) {
    kinds.push({kind: "time", text: token.text, value: token.time, label});
  }
  if (token.magnitude != null) {
    kinds.push({
      kind: "number",
      text: token.text,
      value: token.magnitude.toFixed(token.digits ?? 0),
      label,
      ...(token.currency != null ? {currency: token.currency} : {})
    });
  }

  return kinds;
}
