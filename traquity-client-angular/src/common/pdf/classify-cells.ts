import {parseDate} from "./parse-date";
import {parseNumber, ParsedNumber} from "./parse-number";
import {PdfCell, PdfCellBox, PdfToken} from "./pdf-document.type";

const CURRENCY: RegExp = /^[A-Z]{3}$/;
const TIME: RegExp = /^(\d{1,2}):(\d{2}):(\d{2})$/;

/**
 * Stage 5 — what each word of a cell is, as a fact about that cell alone.
 *
 * A word that is a number carries its magnitude and, separately, the `-`/`+` a settlement prints behind it to mark
 * the direction of the booking. A currency is taken from the same cell or from the next one to the right, which is
 * where these documents print it: `10,00-` and `EUR` are two runs a wide gap apart. Words that are neither a
 * number, a date nor a time produce no token and stay plain text.
 *
 * @param cells one row's cells, left to right, since a currency is read across the boundary to the next one.
 */
export function classifyCells(cells: PdfCellBox[]): PdfCell[] {
  return cells.map((cell: PdfCellBox, index: number): PdfCell => {
    const words: string[] = cell.text.split(/\s+/);
    const tokens: PdfToken[] = [];

    for (let i: number = 0; i < words.length; i++) {
      const word: string = words[i];
      const number: ParsedNumber | null = parseNumber(word);
      const date: string | null = parseDate(word);
      const isTime: boolean = TIME.test(word);
      if (number == null && date == null && !isTime) {
        continue;
      }

      const following: string | undefined = i + 1 < words.length
        ? words[i + 1]
        : cells[index + 1]?.text.split(/\s+/)[0];
      const currency: string | null = number != null && following != null && CURRENCY.test(following)
        ? following
        : null;

      tokens.push({
        text: word,
        label: words.slice(0, i).join(" ") || null,
        ...(number != null ? {number: number.value, digits: number.digits} : {}),
        ...(number?.sign != null ? {sign: number.sign} : {}),
        ...(currency != null ? {currency} : {}),
        ...(date != null ? {date} : {}),
        ...(isTime ? {time: word} : {}),
        last: i === words.length - 1,
      });
    }

    return {...cell, tokens};
  });
}
