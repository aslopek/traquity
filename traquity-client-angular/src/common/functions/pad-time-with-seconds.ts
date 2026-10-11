/**
 * Pads a time of the shape `HH:mm` with `:00` seconds.
 *
 * @param time the time to pad.
 * @returns `time` unchanged when it already carries seconds or is not that shape at all.
 */
export function padTimeWithSeconds(time: string): string {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}
