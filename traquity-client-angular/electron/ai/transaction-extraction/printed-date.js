/**
 * A calendar date as a document prints it, read into the notation an answer uses: `yyyy-MM-dd`.
 */

/**
 * One printed word, anchored at both ends against a digit or a separator so a longer run is never read as the date
 * its first few characters resemble.
 *
 * Matches:
 *
 * - `04.04.2022`, `4.7.2024`, `2024-02-02`, `2024/02/02`, `12/25/2024`, `04.04.22`
 * - `27.04.2026 17:14:36` -> `27.04.2026`
 * - `Datum:04.04.2022,EUR` -> `04.04.2022`
 * - `(04.04.2022)` -> `04.04.2022`
 * - `ISIN04.04.2022` -> `04.04.2022`
 * - `904.04.2022` -> `904.04.2022`
 *
 * No match:
 *
 * - `0883.04281612.0001257`
 * - `1.2.3.4`
 * - `1.005,00`
 * - `17:14:36`
 * - `x-04.04.2022`, `04.04.2022-x`, `04.04.2022.5`
 * - `01.01.2025-31.12.2025`
 *
 * @type {RegExp}
 */
const PRINTED_DATE = /(?<![\d./-])\d{1,4}[./-]\d{1,2}[./-]\d{1,4}(?![\d./-])/g;

/** @type {number} */
const MONTHS_PER_YEAR = 12;

/**
 * @param {number} year
 * @param {number} month 1 <= month <= 12
 * @returns {number} how long that month is, 28 to 31 days, February in a leap year included
 */
function daysInMonth(year, month) {
  // `Date.UTC` counts months from 0 and days from 1, so passing month as-is references the next month and day 0 makes it the last day
  // of the previous month
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0));
  return lastDayOfMonth.getUTCDate();
}

/**
 * @param {number} year
 * @param {number} month 1 <= month <= 12
 * @param {number} day day >= 1
 * @returns {string | null} the date as `yyyy-MM-dd`, or `null` where the three do not name a day of the calendar
 */
function dateOf(year, month, day) {
  if (month < 1 || month > MONTHS_PER_YEAR || day < 1) {
    return null;
  }
  if (day > daysInMonth(year, month)) {
    return null;
  }
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * @param {string} printed one word as the page prints it
 * @returns {string[]} every reading of that word in the answer's notation, the likelier one first; empty where the
 *   word names no day of the calendar
 */
function readingsOf(printed) {
  /** @type {string[]} */
  const parts = printed.split(/[./-]/);
  if (parts.length !== 3 || !parts.every(part => /^\d+$/.test(part))) {
    return [];
  }
  /** @type {number} */
  const first = Number(parts[0]);
  /** @type {number} */
  const second = Number(parts[1]);
  /** @type {number} */
  const third = Number(parts[2]);

  // A four-digit field is the year, and it sits at one end or the other
  if (parts[0]?.length === 4) {
    return [dateOf(first, second, third)].filter(reading => reading != null);
  }
  if (parts[2]?.length !== 4) {
    return [];
  }

  /** @type {string | null} the day-first reading, which every notation but the American one states */
  const dayFirst = dateOf(third, second, first);
  /** @type {string | null} the month-first reading, which only a slashed date can carry */
  const monthFirst = printed.includes('/') ? dateOf(third, first, second) : null;

  return [...new Set([dayFirst, monthFirst].filter(reading => reading != null))];
}

/**
 * @param {string} text
 * @returns {string[]} every distinct reading of every date the text prints, in the order it prints them; a word
 *   shaped like a date that names no day of the calendar contributes none
 */
function datesIn(text) {
  return [...new Set((text.match(PRINTED_DATE) ?? []).flatMap(readingsOf))];
}

/**
 * @param {string} text
 * @returns {string} the text with every printed date replaced by as many spaces, so that everything around a date
 *   keeps both its characters and its position
 */
function maskDatesIn(text) {
  return text.replace(PRINTED_DATE, match => ' '.repeat(match.length));
}

module.exports = {datesIn, maskDatesIn};
