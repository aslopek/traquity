import {DividendYield} from '../gen/api/depot-dividend';

export function dividendYieldFactory(overrides?: Partial<DividendYield>): DividendYield {
  return {
    securityIds: [36],
    displayName: 'Realty Income',
    estimatedPaymentGross: 12,
    estimatedPaymentNet: 9,
    currentYieldGross: 0.06,
    currentYieldNet: 0.045,
    yieldOnCostGross: 0.08,
    yieldOnCostNet: 0.06,
    regularDividendPaymentsPerYear: 12,
    ...overrides
  };
}
