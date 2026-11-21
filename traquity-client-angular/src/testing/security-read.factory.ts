import {SecurityRead, SecurityType} from '../gen/api/security';

export function securityReadFactory(overrides?: Partial<SecurityRead>): SecurityRead {
  return {
    isin: 'US0378331005',
    symbols: ['AAPL'],
    name: 'Apple Inc.',
    securityType: SecurityType.STOCK,
    version: 0,
    id: 1,
    _links: {},
    ...overrides
  };
}

export function withOldestPriceDate(id: number, oldestPriceDate: string): SecurityRead {
  return securityReadFactory({
    id,
    priceMetaInfo: {
      highTrailingTwelveMonths: 2,
      lowTrailingTwelveMonths: 1,
      latestPrice: 1,
      currency: 'EUR',
      latestPriceDate: '2026-02-01',
      oldestPrice: 1,
      oldestPriceDate
    }
  });
}
