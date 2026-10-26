import {RebasedDepotValue} from '../depot/depot-performance/store/computed/rebased-depot-value.type';

export function rebasedDepotValueFactory(overrides?: Partial<RebasedDepotValue>): RebasedDepotValue {
  return {
    date: '2026-01-01',
    investedCapital: 100,
    cashPosition: 0,
    absoluteValue: 100,
    performanceAbsolute: 0,
    performanceRelative: 0,
    ...overrides
  };
}
