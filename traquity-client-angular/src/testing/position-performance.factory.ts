import {PositionPerformance} from '../gen/api/depot-performance';

export function positionPerformanceFactory(overrides?: Partial<PositionPerformance>): PositionPerformance {
  return {
    currency: 'EUR',
    buysGross: -2200,
    sellsGross: 1500,
    dividendsGross: 60,
    taxes: -155,
    fees: -30,
    netCashFlow: -825,
    currentSizeAbsolute: 1400,
    costBasis: 2385,
    performanceAbsolute: 575,
    performanceRelative: 0.2411,
    ...overrides
  };
}
