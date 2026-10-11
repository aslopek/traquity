import {StockSplit} from '../gen/api/security';

export function stockSplitFactory(overrides: Partial<StockSplit> = {}): StockSplit {
  return {
    exDate: '2024-05-20',
    quantityOld: 1,
    quantityNew: 4,
    ...overrides
  };
}
