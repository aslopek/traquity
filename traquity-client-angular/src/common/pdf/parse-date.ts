import {undecorated} from "./undecorated";

/** Month names and abbreviations as German and English documents print them, in calendar order. */
const MONTH_NAMES: string[][] = [
  ["januar", "january", "jan"],
  ["februar", "february", "feb"],
  ["märz", "maerz", "march", "mär", "mar", "mrz"],
  ["april", "apr"],
  ["mai", "may"],
  ["juni", "june", "jun"],
  ["juli", "july", "jul"],
  ["august", "aug"],
  ["september", "sept", "sep"],
  ["oktober", "october", "okt", "oct"],
  ["november", "nov"],
  ["dezember", "december", "dez", "dec"],
];

const MONTH_BY_NAME: Map<string, number> = new Map(MONTH_NAMES.flatMap(
  (names: string[], index: number): [string, number][] => names.map((name: string): [string, number] => [name, index + 1])));

/** The names longest first, so a full name wins the alternation against the abbreviation it begins with. */
const MONTH_NAME: string = [...MONTH_BY_NAME.keys()].sort((a: string, b: string): number => b.length - a.length).join("|");

/** What may stand between the components of a date printed with a month name, including nothing at all. */
const GAP: string = "[-./, ]*";

/** The time of an ISO timestamp, which carries a date the notation states exactly. */
const ISO_TIME: RegExp = /t\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?(?:z|[+-]\d{2}:?\d{2})?$/;

/** `2024-03-14`, and the same order printed with a slash or a dot. Both separators must be the one character. */
const YEAR_FIRST: RegExp = /^(\d{4})([-./])(\d{1,2})\2(\d{1,2})$/;

/** `14.03.2024`, `14/03/2024`, `14-03-24`. Day and month stand in either order; the year is two or four digits. */
const YEAR_LAST: RegExp = /^(\d{1,2})([-./])(\d{1,2})\2(\d{4}|\d{2})$/;

/** `14. März 2024`, `14-Mar-24`, `14th March 2024`. */
const DAY_MONTH_NAME: RegExp = new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?${GAP}(${MONTH_NAME})${GAP}(\\d{4}|\\d{2})$`);

/**
 * `March 14, 2024`, `Mar-14-24`. The day and the year stand next to each other in this order, so something has to
 * separate them: with nothing between them, `Mai 2024` would read as the 20th of May 2024.
 */
const MONTH_NAME_DAY: RegExp = new RegExp(`^(${MONTH_NAME})${GAP}(\\d{1,2})(?:st|nd|rd|th)?[-./, ]+(\\d{4}|\\d{2})$`);

/** The two-digit year the window turns at: `68` reads as 2068 and `69` as 1969, the way POSIX places the century. */
const CENTURY_PIVOT: number = 68;

const MONTHS_PER_YEAR: number = 12;

/** The three numbers a date is made of, each as printed and before any of them is range-checked. */
type DateParts = {
  day: number
  month: number
  year: number
};

/**
 * Every reading of a printed date as `yyyy-MM-dd`, the likelier one first, across the notations a document may
 * print one in:
 *
 * - **year first** — `2024-03-14`, `2024/03/14`, `2024.03.14`, and an ISO timestamp, whose time is dropped
 * - **year last** — `14.03.2024`, `14/03/2024`, `14-03-2024`, each of them with a two-digit year as well
 * - **the month spelled out or abbreviated**, German or English, in either order and with an ordinal suffix
 *   permitted: `14. März 2024`, `14-Mar-24`, `14th March 2024`, `March 14, 2024`
 *
 * The separators of a numeric date must be the one character, so `14.03/2024` is no date and `1.005,00` cannot
 * become one. Two notations are genuinely ambiguous, and each is resolved by a stated rule:
 *
 * - **Day and month of a year-last date.** The day-first reading comes first, since that is what every notation but
 *   the American one states. A slash or a hyphen carries the month-first reading as well, and `04/15/2024`
 *   therefore states the 15th of April once the calendar has refused the other order. **A dot never does**: no
 *   locale writes `MM.dd.yyyy`, so `03.04.2024` has the one reading a German document means by it.
 * - **A two-digit year.** `00` to `68` read as 2000 to 2068, `69` to `99` as 1969 to 1999.
 *
 * A reading has to name a **day of the calendar**, February's length in the stated year included, so `31.02.2024`
 * is no date and `29.02.2024` is one. A date printed with no separator at all (`20240314`) is deliberately not read
 * as one, since eight digits in a row are an order or account number far more often than a date, and reading one as
 * the other is a mistake nothing downstream can see.
 *
 * @returns the readings, or nothing at all where the text is none of those notations.
 */
export function readingsOfDate(text: string): string[] {
  const normalized: string = undecorated(text.trim().toLowerCase().replace(/\s+/g, " ")).replace(ISO_TIME, "");
  return [...new Set(partsOf(normalized)
    .map(dateOf)
    .filter((date: string | null): date is string => date != null))];
}

/**
 * A printed date as `yyyy-MM-dd`, in the reading its notation most likely states.
 *
 * @returns `null` for anything that is not a date.
 */
export function parseDate(text: string): string | null {
  return readingsOfDate(text)[0] ?? null;
}

/** The date those three numbers name, or `null` where the calendar has no such day. */
function dateOf(parts: DateParts): string | null {
  if (parts.month < 1 || parts.month > MONTHS_PER_YEAR || parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) {
    return null;
  }
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0")
  ].join("-");
}

/**
 * How long a month is, 28 to 31 days, February in a leap year included.
 *
 * `Date.UTC` counts months from 0 and days from 1, so passing the month as printed names the month behind it and
 * day 0 makes that the last day of the one asked about.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The numbers of the first notation the text is printed in, unchecked, the likelier reading first. */
function partsOf(text: string): DateParts[] {
  const yearFirst: RegExpExecArray | null = YEAR_FIRST.exec(text);
  if (yearFirst != null) {
    return [{year: Number(yearFirst[1]), month: Number(yearFirst[3]), day: Number(yearFirst[4])}];
  }

  const yearLast: RegExpExecArray | null = YEAR_LAST.exec(text);
  if (yearLast != null) {
    const first: number = Number(yearLast[1]);
    const second: number = Number(yearLast[3]);
    const year: number = yearOf(yearLast[4]);
    const dayFirst: DateParts = {day: first, month: second, year};
    return yearLast[2] === "." ? [dayFirst] : [dayFirst, {day: second, month: first, year}];
  }

  const dayMonthName: RegExpExecArray | null = DAY_MONTH_NAME.exec(text);
  if (dayMonthName != null) {
    return [{day: Number(dayMonthName[1]), month: monthOf(dayMonthName[2]), year: yearOf(dayMonthName[3])}];
  }

  const monthNameDay: RegExpExecArray | null = MONTH_NAME_DAY.exec(text);
  if (monthNameDay != null) {
    return [{day: Number(monthNameDay[2]), month: monthOf(monthNameDay[1]), year: yearOf(monthNameDay[3])}];
  }

  return [];
}

/** The month a name stands for, or `0` for a name that is none, which the calendar check then rejects. */
function monthOf(name: string): number {
  return MONTH_BY_NAME.get(name) ?? 0;
}

/** The year a printed one states, a two-digit one placed in the century its window assigns it to. */
function yearOf(printed: string): number {
  const year: number = Number(printed);
  if (printed.length === 4) {
    return year;
  }
  return year <= CENTURY_PIVOT ? 2000 + year : 1900 + year;
}
