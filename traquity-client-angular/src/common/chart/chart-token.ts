import {withAlpha} from "./with-alpha";

/**
 * Reads a design token off the document root so a canvas-rendered chart paints with the same value the DOM
 * uses. Returns the empty string when the token is not defined, and when there is no document to read it
 * from — echarts then falls back to its own default for that option.
 */
export function chartToken(name: string): string {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") {
    return "";
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Same as `chartToken`, expressed as an `rgba()` string at the given alpha. Only hexadecimal token values
 * (`#rgb` or `#rrggbb`) can be re-alpha'd; anything else is returned unchanged.
 */
export function chartTokenAlpha(name: string, alpha: number): string {
  return withAlpha(chartToken(name), alpha);
}
