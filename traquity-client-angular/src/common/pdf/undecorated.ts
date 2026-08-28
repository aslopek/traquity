/** Everything that is neither a letter nor a digit, at one end of a word or the other. */
const DECORATION: RegExp = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** The same, with the `+`/`-` a booking sign is printed as kept, since that is a value's own notation. */
const DECORATION_AROUND_SIGN: RegExp = /^[^\p{L}\p{N}+-]+|[^\p{L}\p{N}+-]+$/gu;

/**
 * The word without what a page prints around a value: the colon behind a label, the bracket a note is set in, the
 * full stop ending a sentence, the percent sign stating that a figure is a rate.
 *
 * Only the ends are touched, so every character a notation places *between* its first and its last one survives —
 * the separators of `1.005,00`, the colons of `14:05:00`, the dots of `14.03.2024`. A letter is never decoration:
 * `ABC123` is an identifier and `1.005,00EUR` an amount with its code written against it, and reading a value out
 * of either would be reading one the page does not state.
 *
 * @param keepSign whether a leading or trailing `+`/`-` belongs to the value, as it does for an amount
 */
export function undecorated(text: string, {keepSign = false}: { keepSign?: boolean } = {}): string {
  return text.replace(keepSign ? DECORATION_AROUND_SIGN : DECORATION, "");
}
