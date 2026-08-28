/**
 * A time of day as a document prints it, read into the notation an answer uses: `HH:mm:ss`, on the 24-hour clock.
 *
 * A page printing a 12-hour clock is read into that same notation, so `4:37 pm` becomes `16:37:00`.
 *
 * Every field is range-checked, so for example `25:99` will not be read as time.
 */

/**
 * One printed word, anchored at both ends against a digit or a colon so a longer run of them is never read as the
 * time its first few characters resemble.
 *
 * The fourth group is bounded at three digits: a broker prints hundredths or milliseconds there, and anything
 * longer is not a fraction of a second. A meridiem is part of the match, so that a 12-hour clock is masked out of a
 * text as completely as a 24-hour one.
 *
 * Matches:
 *
 * - `17:14:36`, `17:14`, `9:05`, `17:14:36:250`
 * - `4:37 pm`, `4:37pm`, `4:37 PM`, `12:00 a.m.`
 * - `27.04.2026 17:14:36` -> `17:14:36`
 * - `um 9:05 Uhr` -> `9:05`
 * - `x9:05` -> `9:05`
 * - `9:05:00.250` -> `9:05:00`
 * - `von 10:30-11:00` -> `10:30`, `11:00`
 * - `4:37 pmx` -> `4:37`
 * - `25:99` and `Verhältnis 1:20` -> the shape alone, no time of day
 *
 * No match:
 *
 * - `1:2`
 * - `12:345`
 * - `123:45`
 * - `1:2:3:4:5`
 * - `17:14:36:2503`
 * - `04.04.2022`
 *
 * @type {RegExp}
 */
const PRINTED_TIME = /(?<![\d:])\d{1,2}:\d{2}(?::\d{2}(?::\d{1,3})?)?(?![\d:])(?:\s?[apAP]\.?[mM]\.?(?![a-zA-Z]))?/g;

/**
 * The meridiem behind a clock face, in the forms a page prints it: `am`, `a.m.`, either case, with or without the
 * space in front of it.
 *
 * @type {RegExp}
 */
const MERIDIEM = /\s?([apAP])\.?[mM]\.?$/;

/**
 * The half of the day a 12-hour clock states, case-folded: `a` for the one before noon, `p` for the one after it.
 *
 * @typedef {'a' | 'p'} Meridiem
 */

/** @type {number} */
const HOURS_PER_DAY = 24;

/** @type {number} */
const HOURS_PER_HALF_DAY = 12;

/** @type {number} */
const MINUTES_PER_HOUR = 60;

/**
 * @param {number} hours the hour a 12-hour clock shows, 1 to 12
 * @param {Meridiem} half
 * @returns {number | null} that hour on the 24-hour clock, `12` reading as `0` before noon and staying `12` after
 *   noon, or `null` where no 12-hour clock shows the given hour
 */
function hourOfDay(hours, half) {
  if (hours < 1 || hours > HOURS_PER_HALF_DAY) {
    return null;
  }
  /** @type {number} */
  const beforeNoon = hours % HOURS_PER_HALF_DAY;
  return half === 'p' ? beforeNoon + HOURS_PER_HALF_DAY : beforeNoon;
}

/**
 * @param {string} printed one word as the page prints it
 * @returns {string | null} that time as `HH:mm:ss`, or `null` where the word states no time
 */
function readingOf(printed) {
  const half = /** @type {Meridiem | undefined} */ (printed.match(MERIDIEM)?.[1]?.toLowerCase());
  /** @type {string[]} */
  const parts = printed.replace(MERIDIEM, '').split(':');
  if (parts.length < 2 || parts.length > 4 || !parts.every(part => /^\d+$/.test(part))) {
    return null;
  }

  /** @type {number | null} */
  const hours = half === undefined ? Number(parts[0]) : hourOfDay(Number(parts[0]), half);
  /** @type {number} */
  const minutes = Number(parts[1]);
  /** @type {number} */
  const seconds = parts.length > 2 ? Number(parts[2]) : 0;

  if (hours === null || hours >= HOURS_PER_DAY || minutes >= MINUTES_PER_HOUR || seconds >= MINUTES_PER_HOUR) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * @param {string} text
 * @returns {string[]} every distinct reading of every time the text prints, in the order it prints them; a word
 *   shaped like a clock that states no time of day contributes none
 */
function timesIn(text) {
  return [...new Set((text.match(PRINTED_TIME) ?? []).map(readingOf).filter(reading => reading != null))];
}

/**
 * @param {string} text
 * @returns {string} the text with every printed time replaced by as many spaces, so that everything around a time
 *   keeps both its characters and its position
 */
function maskTimesIn(text) {
  return text.replace(PRINTED_TIME, match => ' '.repeat(match.length));
}

module.exports = {maskTimesIn, timesIn};
