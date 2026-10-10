/**
 * The number of decimal places a share count is exact to. Past this, a difference is representation error and not a
 * fraction of a share anyone trades.
 */
const SHARE_COUNT_DECIMALS: number = 10;

/**
 * Rounds to the decimal places a share count is exact to, which clears the error that accumulates when decimal
 * share counts are added or subtracted as `number`s (`0.7 + 0.1` holds `0.7999999999999999` instead of `0.8`). Two counts that agree
 * to 10 decimals therefore come out of this strictly equal.
 *
 * @param count the share count to round
 * @return `count` rounded to 10 decimal places
 */
export function roundShareCount(count: number): number {
  const factor: number = 10 ** SHARE_COUNT_DECIMALS;
  return Math.round(count * factor) / factor;
}
