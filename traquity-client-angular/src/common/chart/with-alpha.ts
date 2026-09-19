/**
 * The given color expressed as an `rgba()` string at the given alpha. Only hexadecimal values (`#rgb` or
 * `#rrggbb`) can be re-alpha'd; anything else is returned unchanged.
 */
export function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith("#")) {
    return color;
  }

  const digits: string = color.slice(1);
  if (digits.length !== 3 && digits.length !== 6) {
    return color;
  }

  const expanded: string = digits.length === 3
    ? `${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
    : digits;
  const red: number = parseInt(expanded.slice(0, 2), 16);
  const green: number = parseInt(expanded.slice(2, 4), 16);
  const blue: number = parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
