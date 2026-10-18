import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {StockSplit, StockSplitApi} from '../../../gen/api/security';
import {stockSplitFactory} from '../../../testing/stock-split.factory';
import {stockSplitsBySecurityId} from './stock-splits-by-security-id';

type GetStockSplits = (id: number) => Observable<StockSplit[]>;

describe('stockSplitsBySecurityId', (): void => {
  let scheduler: TestScheduler;
  let getStockSplits: jest.Mock<GetStockSplits>;
  let stockSplitApi: StockSplitApi;
  let splitsOf1: StockSplit[];
  let splitsOf2: StockSplit[];

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });
    getStockSplits = jest.fn<GetStockSplits>();
    stockSplitApi = {getStockSplits} as unknown as StockSplitApi;
    splitsOf1 = [stockSplitFactory()];
    splitsOf2 = [stockSplitFactory({exDate: '2025-01-01'})];
  });

  it('emits the stock splits of every security id in one map', (): void => {
    scheduler.run(({cold, expectObservable}: RunHelpers): void => {
      getStockSplits.mockImplementation((id: number): Observable<StockSplit[]> => cold('-a|', {
        a: id === 1 ? splitsOf1 : splitsOf2
      }));

      expectObservable(stockSplitsBySecurityId(stockSplitApi, [1, 2])).toBe('----(m|)', {
        m: new Map([
          [1, splitsOf1],
          [2, splitsOf2]
        ])
      });
    });
    expect(getStockSplits.mock.calls).toEqual([[1], [2]]);
  });

  it('contributes an empty array for an id whose lookup fails, keeping the other ids\' splits', (): void => {
    scheduler.run(({cold, expectObservable}: RunHelpers): void => {
      getStockSplits.mockImplementation((id: number): Observable<StockSplit[]> =>
        id === 1 ? cold('-#', undefined, new Error('not found')) : cold('-a|', {a: splitsOf2}));

      expectObservable(stockSplitsBySecurityId(stockSplitApi, [1, 2])).toBe('---(m|)', {
        m: new Map([
          [1, []], // error yields empty splits
          [2, splitsOf2] // error does not block other requests
        ])
      });
    });
  });

  it('sends the requests one at a time, in the given order', (): void => {
    scheduler.run(({cold}: RunHelpers): void => {
      getStockSplits.mockImplementation((): Observable<StockSplit[]> => cold('-a|', {a: []}));

      stockSplitsBySecurityId(stockSplitApi, [1, 2, 3]).subscribe();
    });
    expect(getStockSplits.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('emits an empty map and sends no request for an empty list of ids', (): void => {
    scheduler.run(({expectObservable}: RunHelpers): void => {
      expectObservable(stockSplitsBySecurityId(stockSplitApi, [])).toBe('(m|)', {m: new Map()});
    });
    expect(getStockSplits).not.toHaveBeenCalled();
  });
});
