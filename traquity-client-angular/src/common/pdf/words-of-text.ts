/**
 * Whitespace that separates two words. A no-break space is not among it: it groups the thousands of `1 005,00` on
 * the pages printing it that way.
 */
const SEPARATOR: RegExp = /[^\S\u00A0\u202F]+/;

/**
 * The words a text is printed as.
 *
 * @returns the words, with no empty one among them.
 */
export function wordsOf(text: string): string[] {
  return text.split(SEPARATOR).filter((word: string): boolean => word !== "");
}
