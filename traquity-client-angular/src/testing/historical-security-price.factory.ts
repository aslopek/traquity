import {HistoricalSecurityPrice} from '../gen/api/historical-security-price';

export function historicalSecurityPriceFactory(overrides?: Partial<HistoricalSecurityPrice>): HistoricalSecurityPrice {
  return {
    securityId: 1,
    price: 10,
    currency: 'EUR',
    date: '2026-01-01',
    ...overrides
  };
}
