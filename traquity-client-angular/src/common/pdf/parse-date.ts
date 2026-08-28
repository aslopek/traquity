const DATE_DMY: RegExp = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

/**
 * A `dd.MM.yyyy` date as `yyyy-MM-dd`: `14.03.2024` becomes `2024-03-14`. Day and month are range-checked against
 * the calendar's outer bounds only, so `31.02.2024` passes — a document printing an impossible date says more
 * about the document than a rejection here would.
 *
 * @returns `null` for anything that is not that shape.
 */
export function parseDate(text: string): string | null {
  const match: RegExpExecArray | null = DATE_DMY.exec(text.trim());
  if (match == null) {
    return null;
  }

  const day: number = Number(match[1]);
  const month: number = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
