const WORKDAYS_PER_WEEK = 5;

function dayOfWeekFromMonday(payDate: string): number {
  return (new Date(payDate).getUTCDay() + 6) % 7;
}

/**
 * @param payDate a calendar date as `YYYY-MM-DD`
 * @returns that week's Monday as `YYYY-MM-DD`
 */
export function weekStartOf(payDate: string): string {
  const monday: Date = new Date(payDate);
  monday.setUTCDate(monday.getUTCDate() - dayOfWeekFromMonday(payDate));
  return monday.toISOString().split('T')[0];
}

/**
 * @param payDate a calendar date as `YYYY-MM-DD`
 * @returns `0` for Monday up to `4` for Friday (Saturday and Sunday are merged into Friday)
 */
export function workdayColumnOf(payDate: string): number {
  return Math.min(dayOfWeekFromMonday(payDate), WORKDAYS_PER_WEEK - 1);
}
