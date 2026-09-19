import {PdfCell, PdfRow, PdfToken} from "./pdf-document.type";

/**
 * The text naming a value: what stands in front of it in its own cell, or the cell to its left where it opens the
 * cell. Never further, since a row crosses column blocks unrelated to each other.
 */
export function labelOfToken(token: PdfToken, cell: PdfCell, row: PdfRow, index: number): string | null {
  const own: string | null = token.label ?? (cell.tokens[0] === token ? row.cells[index - 1]?.text ?? null : null);
  const label: string = (own ?? "").replace(/[:\s]+$/, "").trim();
  return label === "" ? null : label;
}
