import {Lot} from '../gen/api/depot-position';

export function lotFactory(overrides?: Partial<Lot>): Lot {
  return {
    depotId: 1,
    securityId: 1,
    currency: 'EUR',
    date: '2024-01-15',
    time: '10:00:00',
    holdingPeriodInDays: 365,
    count: 20,
    buyInAbsolute: 200,
    fee: 6,
    tax: 0,
    currentSizeAbsolute: 250,
    performanceAbsolute: 50,
    performanceRelative: 0.25,
    cagr: 0.25,
    ...overrides
  };
}
