import {describe, expect, it} from '@jest/globals';
import {StockSplit} from '../../../gen/api/security';
import {stockSplitFactory} from '../../../testing/stock-split.factory';
import {splitAdjustedCount} from './split-adjusted-count';

describe('splitAdjustedCount', (): void => {
  const securityCountOriginal: number = 10;
  const date: string = '2024-02-02';

  it('applies a single split with an exDate after the transaction\'s date', (): void => {
    const split: StockSplit = stockSplitFactory({exDate: '2024-05-20', quantityOld: 1, quantityNew: 4});

    expect(splitAdjustedCount(securityCountOriginal, date, [split])).toBe(securityCountOriginal * (split.quantityNew / split.quantityOld));
  });

  it('does not apply a split whose exDate is the transaction\'s own date', (): void => {
    const split: StockSplit = stockSplitFactory({exDate: date});

    expect(splitAdjustedCount(securityCountOriginal, date, [split])).toBeUndefined();
  });

  it('does not apply a split whose exDate is before the transaction\'s date', (): void => {
    const split: StockSplit = stockSplitFactory({exDate: '2024-01-01'});

    expect(splitAdjustedCount(securityCountOriginal, date, [split])).toBeUndefined();
  });

  it('multiplies the ratio of every applying split, ignoring the ones that don\'t apply', (): void => {
    const applying1: StockSplit = stockSplitFactory({exDate: '2024-05-20', quantityOld: 1, quantityNew: 4});
    const applying2: StockSplit = stockSplitFactory({exDate: '2025-01-10', quantityOld: 2, quantityNew: 3});
    const notApplying: StockSplit = stockSplitFactory({exDate: '2024-01-01', quantityOld: 1, quantityNew: 2});

    const result: number | undefined = splitAdjustedCount(securityCountOriginal, date, [applying1, applying2, notApplying]);

    expect(result).toBe(securityCountOriginal
      * (applying1.quantityNew / applying1.quantityOld)
      * (applying2.quantityNew / applying2.quantityOld));
  });

  it('returns undefined for an empty list of splits', (): void => {
    expect(splitAdjustedCount(securityCountOriginal, date, [])).toBeUndefined();
  });

  it('reaches the same result regardless of the order the splits are given in', (): void => {
    const applying1: StockSplit = stockSplitFactory({exDate: '2024-05-20', quantityOld: 1, quantityNew: 4});
    const applying2: StockSplit = stockSplitFactory({exDate: '2025-01-10', quantityOld: 2, quantityNew: 3});

    const ascending: number | undefined = splitAdjustedCount(securityCountOriginal, date, [applying1, applying2]);
    const descending: number | undefined = splitAdjustedCount(securityCountOriginal, date, [applying2, applying1]);

    expect(descending).toBe(ascending);
  });
});
