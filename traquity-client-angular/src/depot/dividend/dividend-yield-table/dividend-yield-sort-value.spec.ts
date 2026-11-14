import {beforeEach, describe, expect, it} from '@jest/globals';
import {DividendYield} from '../../../gen/api/depot-dividend';
import {dividendYieldFactory} from '../../../testing/dividend-yield.factory';
import {dividendYieldSortValue} from './dividend-yield-sort-value';

describe('dividendYieldSortValue', (): void => {
  let dividendYield: DividendYield;

  beforeEach((): void => {
    dividendYield = dividendYieldFactory();
  });

  it('returns a present yield', (): void => {
    expect(dividendYieldSortValue(dividendYield, 'currentYieldGross')).toBe(dividendYield.currentYieldGross);
  });

  it.each([
    'currentYieldGross',
    'currentYieldNet',
    'yieldOnCostGross',
    'yieldOnCostNet'
  ] as const satisfies readonly (keyof DividendYield)[])('returns infinity for an absent %s', (property): void => {
      dividendYield = dividendYieldFactory({
        [property]: undefined
      });

      expect(dividendYieldSortValue(dividendYield, property)).toBe(Number.POSITIVE_INFINITY);
    }
  );

  it('returns a zero yield as zero', (): void => {
    dividendYield = dividendYieldFactory({yieldOnCostNet: 0});

    expect(dividendYieldSortValue(dividendYield, 'yieldOnCostNet')).toBe(0);
  });

  it('returns a number property other than a yield', (): void => {
    expect(dividendYieldSortValue(dividendYield, 'estimatedPaymentGross')).toBe(dividendYield.estimatedPaymentGross);
  });

  it('returns a string property', (): void => {
    expect(dividendYieldSortValue(dividendYield, 'displayName')).toBe(dividendYield.displayName);
  });

  it('returns an empty string for a property that is neither number nor string', (): void => {
    expect(dividendYieldSortValue(dividendYield, 'securityIds')).toBe('');
  });

  it('returns an empty string for an absent property other than a yield', (): void => {
    expect(dividendYieldSortValue(dividendYield, 'securityGroupId')).toBe('');
  });
});
