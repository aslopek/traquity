import {parseDate} from "./parse-date";
import {parseNumber, ParsedNumber} from "./parse-number";
import {parseTime} from "./parse-time";
import {PdfCell, PdfCellBox, PdfNumberSign, PdfToken} from "./pdf-document.type";

const SIGN: RegExp = /^[+-]$/;
const MERIDIEM: RegExp = /^[AaPp]\.?[Mm]\.?$/;

/** The most words one date takes, which a spelled-out month and a day printed apart from it need. */
const MAXIMUM_DATE_WORDS: number = 3;

/** What a document prints in front of an amount, and where that run of words begins. */
type AmountPrefix = {
  /** Index of the first word belonging to the amount, so everything in front of it is the label. */
  start: number
  /** The `-`/`+` printed as a word of its own, or `null` where the amount carries its sign against the digits. */
  sign: PdfNumberSign | null
  /** Whether the currency code is printed in front of the amount. */
  currency: boolean
};

/** A date and the index of the last word it is printed across. */
type PrintedDate = {
  date: string
  end: number
};

/**
 * Stage 5 — what each word of a cell is.
 *
 * A word that is a number carries its magnitude and, separately, the `-`/`+` a settlement prints to mark the
 * direction of the booking: against the digits on either end (`10,00-`, `-264,60`) or as a word of its own on
 * either side (`- 264,60`, `0,58 -`). An amount counts as denoted in `currency` where that code stands on either
 * side of it, past a sign standing between the two and crossing into the neighbouring cell where the amount closes
 * or opens its own — `10,00-` and `EUR`, and `EUR` and `-264,60`, are two runs a wide gap apart. Neither the sign
 * nor the currency is part of the label, which is the text naming the amount. A time takes in the `AM`/`PM`
 * printed behind it, across that same boundary, and a date the words its notation spells the month out across.
 * Words that are neither a number, a date nor a time produce no token and stay plain text.
 *
 * @param cells one row's cells, left to right, since a currency is read across the boundary to either neighbour.
 * @param currency the code the amounts are to be read in
 */
export function classifyCells(cells: PdfCellBox[], currency: string): PdfCell[] {
  return cells.map((cell: PdfCellBox, index: number): PdfCell => {
    const words: string[] = wordsOf(cell);
    const tokens: PdfToken[] = [];

    for (let i: number = 0; i < words.length; i++) {
      const word: string = words[i];
      const printedDate: PrintedDate | null = dateAt(words, i);
      const spelled: boolean = printedDate != null && printedDate.end > i;
      const parsed: ParsedNumber | null = spelled ? null : parseNumber(word);
      const meridiem: string | null = meridiemBehind(words, i, cells[index + 1]);
      const time: string | null = parseTime(meridiem != null ? `${word} ${meridiem}` : word);
      if (parsed == null && printedDate == null && time == null) {
        continue;
      }

      const prefix: AmountPrefix = parsed != null ? prefixOf(words, i, currency) : {start: i, sign: null, currency: false};
      const trailingSign: PdfNumberSign | null = parsed != null ? trailingSignOf(words, i) : null;
      const takesNextWord: boolean = trailingSign != null || (meridiem != null && i + 1 < words.length);
      const end: number = Math.max(printedDate?.end ?? i, takesNextWord ? i + 1 : i);
      const sign: PdfNumberSign | null = parsed?.sign ?? prefix.sign ?? trailingSign;
      const behind: string | undefined = end + 1 < words.length ? words[end + 1] : wordsOf(cells[index + 1])[0];
      // at(-1) returns the last entry or undefined
      const inFront: string | undefined = prefix.start === 0 ? wordsOf(cells[index - 1]).at(-1) : undefined;
      const denoted: boolean = parsed != null && (behind === currency || prefix.currency || inFront === currency);

      tokens.push({
        text: spelled ? words.slice(i, end + 1).join(" ") : word,
        label: words.slice(0, prefix.start).join(" ") || null,
        ...(parsed != null ? {magnitude: parsed.magnitude, digits: parsed.digits} : {}),
        ...(sign != null ? {sign} : {}),
        ...(denoted ? {currency} : {}),
        ...(printedDate != null ? {date: printedDate.date} : {}),
        ...(time != null ? {time} : {}),
        last: end === words.length - 1,
      });
      i = end;
    }

    return {...cell, tokens};
  });
}

/**
 * The date printed at `index`, taking in the words behind it where the notation spells the month out — `14. März
 * 2024` is one value across three words. The longest run that reads as a date wins, so a year standing behind a
 * complete date is never cut off from it.
 *
 * @returns `null` where no date begins at `index`.
 */
function dateAt(words: string[], index: number): PrintedDate | null {
  for (let end: number = Math.min(index + MAXIMUM_DATE_WORDS - 1, words.length - 1); end >= index; end--) {
    const date: string | null = parseDate(words.slice(index, end + 1).join(" "));
    if (date != null) {
      return {date, end};
    }
  }
  return null;
}

/**
 * Where the amount at `index` begins: the sign and the currency code printed in front of it belong to it, in
 * either order. A sign standing between two values separates them — `04106 - 708`, `01.01.2022 - 31.12.2026` —
 * and stays a word of the label.
 */
function prefixOf(words: string[], index: number, currency: string): AmountPrefix {
  const prefix: AmountPrefix = {
    start: index,
    sign: null,
    currency: false
  };
  while (prefix.start > 0) {
    const word: string = words[prefix.start - 1];
    if (prefix.sign == null && SIGN.test(word) && !isValue(words[prefix.start - 2])) {
      prefix.sign = word as PdfNumberSign; // typecast is okay, since SIGN.test proves it fulfils the type
    } else if (!prefix.currency && word === currency) {
      prefix.currency = true;
    } else {
      break;
    }
    prefix.start--;
  }
  return prefix;
}

/**
 * The sign the amount at `index` is printed with as a word of its own behind it, e.g. `0,58 -` or`0,58-`.
 *
 * @returns `null` where no sign follows, or where it separates the amount from the next value behind it.
 */
function trailingSignOf(words: string[], index: number): PdfNumberSign | null {
  const word: string | undefined = words[index + 1];
  return word != null && SIGN.test(word) && !isValue(words[index + 2]) ? word as PdfNumberSign : null;
}

/**
 * The `AM`/`PM` printed behind the time at `index` as a word of its own — in this cell, or as the first word of
 * the one to its right where the time closes its own, since a wide gap between the two says nothing about whether
 * the second word belongs to the first.
 *
 * A value behind the candidate makes it a word of the text instead: German prints `am` in front of the date it
 * introduces, and `12:30 am 05.02.2021` states half past noon and not half past midnight.
 *
 * @returns `null` where no such word follows, or where the time does not read on the 12-hour clock with it.
 */
function meridiemBehind(words: string[], index: number, next: PdfCellBox | undefined): string | null {
  const behind: string[] = index + 1 < words.length ? words.slice(index + 1) : wordsOf(next);
  const word: string | undefined = behind[0];
  if (word == null || !MERIDIEM.test(word) || isValue(behind[1])) {
    return null;
  }
  return parseTime(`${words[index]} ${word}`) != null ? word : null;
}

/** Whether a word carries a value of its own. A sign between two words is not a sign but a separator. */
function isValue(word: string | undefined): boolean {
  return word != null && (parseNumber(word) != null || parseDate(word) != null);
}

/**
 * The words of a cell, or none where the row has no cell at that position.
 *
 * A no-break space is what it says it is and never separates two words: it is what groups the thousands of
 * `1 005,00` on the pages that print it that way, so splitting on it would make two numbers out of one.
 */
function wordsOf(cell: PdfCellBox | undefined): string[] {
  return cell == null ? [] : cell.text.split(/[^\S\u00A0\u202F]+/).filter((word: string): boolean => word !== "");
}
