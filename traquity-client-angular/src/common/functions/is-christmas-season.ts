/**
 * @param date the date to check
 * @returns true for a date from the first Sunday of Advent through January 6th, false otherwise
 */
export function isChristmasSeason(date: Date): boolean {
  return date >= firstSundayOfAdvent(date.getFullYear()) || (date.getMonth() === 0 && date.getDate() <= 6);
}

function firstSundayOfAdvent(year: number): Date {
  const november27: Date = new Date(year, 10, 27);
  // a day past November 30th rolls over into December
  return new Date(year, 10, 27 + (7 - november27.getDay()) % 7);
}
