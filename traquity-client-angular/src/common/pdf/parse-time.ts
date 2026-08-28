import {undecorated} from "./undecorated";

const TIME: RegExp = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[:.,]\d{1,3})?(?:\s*([AaPp])\.?[Mm]\.?)?$/;

/**
 * A printed time as `HH:mm:ss` on the 24-hour clock, zero-padded: `9:05` becomes `09:05:00` and `4:30 PM` becomes
 * `16:30:00`. A time printed without seconds reads on the full minute, since that notation is what states a time
 * unambiguously, and anything finer than a second is dropped, whether a settlement prints it behind a fourth
 * colon (`17:28:43:27`) or behind a decimal separator — no figure on these documents is read to that precision.
 *
 * Hours, minutes and seconds are range-checked, and against the 12-hour clock where an `AM`/`PM` says the time
 * was printed on that one. What a page prints around the clock face — the bracket a note is set in, the colon
 * behind a label — is no part of it.
 *
 * @returns `null` for anything that is not that shape.
 */
export function parseTime(text: string): string | null {
  const match: RegExpExecArray | null = TIME.exec(undecorated(text.trim()));
  if (match == null) {
    return null;
  }

  const printedMinutes: string = match[2];
  const printedSeconds: string | undefined = match[3];
  const meridiem: string | undefined = match[4];
  const hours: number | null = hoursOn24HourClock(Number(match[1]), meridiem);
  if (hours == null || Number(printedMinutes) > 59 || (printedSeconds != null && Number(printedSeconds) > 59)) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${printedMinutes}:${printedSeconds ?? "00"}`;
}

/**
 * The hour on the 24-hour clock, read on the clock the meridiem says it was printed on.
 *
 * @returns `null` where that clock has no such hour, which is a `13` in front of a `PM` as much as a `25`.
 */
function hoursOn24HourClock(hours: number, meridiem: string | undefined): number | null {
  if (meridiem == null) {
    return hours <= 23 ? hours : null;
  }
  if (hours < 1 || hours > 12) {
    return null;
  }
  if (meridiem.toUpperCase() === "P") {
    return hours === 12 ? 12 : hours + 12;
  }
  return hours === 12 ? 0 : hours;
}
