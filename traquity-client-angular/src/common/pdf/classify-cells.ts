import {parseDate} from "./parse-date";
import {parseNumber, ParsedNumber} from "./parse-number";
import {parseTime} from "./parse-time";
import {PdfCell, PdfCellBox, PdfNumberSign, PdfToken} from "./pdf-document.type";
import {wordsOf as wordsOfText} from "./words-of-text";

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
  /** The currency code printed in front of the amount, or `null` where none is. */
  currency: string | null
};

/** A date and the index of the last word it is printed across. */
type PrintedDate = {
  date: string
  end: number
};

/**
 * Stage 5 — what each word of a cell is.
 *
 * A number carries its magnitude and, separately, the `-`/`+` a settlement prints for the direction of the
 * booking: against the digits (`10,00-`, `-264,60`) or as a word of its own on either side (`- 264,60`, `0,58 -`).
 * An amount is denoted where `currency` stands on one side of it, past a sign between the two and across the
 * boundary into a neighbouring cell. Neither the sign nor the code belongs to the label. A time takes in the
 * `AM`/`PM` behind it, across that same boundary, and a date the words its notation spells the month out across.
 * Words that are none of the three produce no token and stay plain text.
 *
 * @param cells one row's cells, left to right, since a currency is read across the boundary to either neighbour.
 * @param currency the one code an amount may be denoted in, matched exactly and as the page prints it. Every other
 *   word is text, so an amount stated in another currency is left undenoted.
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

      const prefix: AmountPrefix = parsed != null ? prefixOf(words, i, currency) : {start: i, sign: null, currency: null};
      const trailingSign: PdfNumberSign | null = parsed != null ? trailingSignOf(words, i) : null;
      const takesNextWord: boolean = trailingSign != null || (meridiem != null && i + 1 < words.length);
      const end: number = Math.max(printedDate?.end ?? i, takesNextWord ? i + 1 : i);
      const sign: PdfNumberSign | null = parsed?.sign ?? prefix.sign ?? trailingSign;
      const behind: string | undefined = end + 1 < words.length ? words[end + 1] : wordsOf(cells[index + 1])[0];
      // at(-1) returns the last entry or undefined
      const inFront: string | undefined = prefix.start === 0 ? wordsOf(cells[index - 1]).at(-1) : undefined;
      const denotedIn: string | null = parsed == null ? null : currencyOf(behind, prefix.currency, inFront, currency);

      tokens.push({
        text: spelled ? words.slice(i, end + 1).join(" ") : word,
        label: words.slice(0, prefix.start).join(" ") || null,
        ...(parsed != null ? {magnitude: parsed.magnitude, digits: parsed.digits} : {}),
        ...(sign != null ? {sign} : {}),
        ...(denotedIn != null ? {currency: denotedIn} : {}),
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
 * and stays a word of the label, and so does the quoted half of an exchange-rate pair.
 */
function prefixOf(words: string[], index: number, currency: string): AmountPrefix {
  const prefix: AmountPrefix = {
    start: index,
    sign: null,
    currency: null
  };
  while (prefix.start > 0) {
    const word: string = words[prefix.start - 1];
    if (prefix.sign == null && SIGN.test(word) && !isValue(words[prefix.start - 2])) {
      prefix.sign = word as PdfNumberSign; // typecast is okay, since SIGN.test proves it fulfils the type
    } else if (prefix.currency == null && word === currency && !quotesARate(words, prefix.start - 1)) {
      prefix.currency = word;
    } else {
      break;
    }
    prefix.start--;
  }
  return prefix;
}

/**
 * Whether the currency code at `index` is the quoted half of an exchange-rate pair — the `EUR` of
 * `Devisenkurs USD / EUR 1,1442`. Such a code denotes nothing: what follows it is the rate between the two
 * currencies and no amount in either of them.
 */
function quotesARate(words: string[], index: number): boolean {
  return words[index - 1] === "/";
}

/**
 * Whether the amount is denoted in `currency`: the code printed behind it, the one printed in front of it inside
 * its own cell, or the one the cell to its left ends on.
 *
 * @param behind the word following the amount, in this cell or the next
 * @param prefix the code found in front of the amount inside its own cell, already known to be one
 * @param inFront the last word of the cell to the left, present only where the amount opens its own
 * @param currency the one code that counts as one
 * @returns the code, or `null` where it stands nowhere beside the amount
 */
function currencyOf(behind: string | undefined, prefix: string | null, inFront: string | undefined, currency: string): string | null {
  if (behind === currency) {
    return behind;
  }
  if (prefix != null) {
    return prefix;
  }
  return inFront === currency ? inFront : null;
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
 * the one to its right where the time closes its own.
 *
 * A value behind the candidate makes it a word of the text instead: German prints `am` in front of the date it
 * introduces, and `12:30 am 05.02.2021` states half past noon and no midnight.
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

/** The words of a cell, or none where the row has no cell at that position. */
function wordsOf(cell: PdfCellBox | undefined): string[] {
  return cell == null ? [] : wordsOfText(cell.text);
}
