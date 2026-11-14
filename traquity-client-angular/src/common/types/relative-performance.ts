/**
 * A ratio of two absolute, monetary values defining a relative performance:
 * - `'infinity'` is a non-zero value over a basis of zero
 * - `'none'` for a value over a negative basis, where no meaningful relative performance exists.
 */
export type RelativePerformance = number | 'infinity' | 'none';
