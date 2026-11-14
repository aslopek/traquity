import {DividendYield} from '../../../gen/api/depot-dividend';

const YIELD_PROPERTIES: readonly string[] = ['currentYieldGross', 'currentYieldNet', 'yieldOnCostGross', 'yieldOnCostNet'] as const;

type YieldProperty = 'currentYieldGross' | 'currentYieldNet' | 'yieldOnCostGross' | 'yieldOnCostNet';

function isYieldProperty(property: string): property is YieldProperty {
  return YIELD_PROPERTIES.includes(property);
}

/**
 * Returns the value a dividend yield sorts by. An absent or null yield is infinite and sorts above every finite one.
 *
 * @param dividendYield the dividend yield to sort
 * @param property the name of the property to sort by
 * @returns the property's value, `Infinity` for an absent or null yield, or an empty string for a value that is neither number nor string
 */
export function dividendYieldSortValue(dividendYield: DividendYield, property: string): string | number {
  if (isYieldProperty(property)) {
    return dividendYield[property] ?? Number.POSITIVE_INFINITY;
  }
  const value: unknown = dividendYield[property as keyof DividendYield];
  return typeof value === 'number' || typeof value === 'string' ? value : '';
}
