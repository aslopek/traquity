import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {HistoricalSecurityPrice, HistoricalSecurityPriceApi} from '../../../../gen/api/historical-security-price';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {AppState} from '../../../../store/app.state';
import {historicalSecurityPriceFactory} from '../../../../testing/historical-security-price.factory';
import {DepotPerformanceComputed, DepotPerformanceState} from '../depot-performance.store';
import {LoadBenchmarkPricesArgs, loadBenchmarkPricesPipe} from './load-benchmark-prices';

jest.mock('@ngrx/signals', (): unknown => ({patchState: jest.fn()}));

type GetHistoricalSecurityPrices = (securityId: number, startDate?: string, currency?: string) => Observable<HistoricalSecurityPrice[]>;
type PerformanceStore = WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>;

describe('loadBenchmarkPricesPipe', (): void => {
  const currency: string = 'EUR';

  let scheduler: TestScheduler;
  let patchStateMock: jest.Mock<(store: unknown, update: Partial<DepotPerformanceState>) => void>;
  let store: PerformanceStore;
  let dispatch: jest.Mock<(action: unknown) => void>;
  let getHistoricalSecurityPrices: jest.Mock<GetHistoricalSecurityPrices>;
  let inputMarbles: string;
  let inputValues: Record<string, LoadBenchmarkPricesArgs>;
  let firstPrices: HistoricalSecurityPrice[];
  let secondPrices: HistoricalSecurityPrice[];
  let firstResponseMarbles: string;
  let secondResponseMarbles: string;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });
    patchStateMock = patchState as unknown as jest.Mock<(store: unknown, update: Partial<DepotPerformanceState>) => void>;
    patchStateMock.mockReset();
    store = {} as PerformanceStore;
    dispatch = jest.fn<(action: unknown) => void>();
    getHistoricalSecurityPrices = jest.fn<GetHistoricalSecurityPrices>();

    firstPrices = [historicalSecurityPriceFactory({securityId: 1, price: 11})];
    secondPrices = [historicalSecurityPriceFactory({securityId: 2, price: 22})];
    inputMarbles = 'a';
    inputValues = {
      a: {securityId: 1, currency},
      b: {securityId: 2, currency: 'USD'},
      n: {securityId: null, currency}
    };
    firstResponseMarbles = '--(v|)';
    secondResponseMarbles = '--(v|)';
  });

  function run(failure?: boolean): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      const first$: Observable<HistoricalSecurityPrice[]> = failure
        ? cold<HistoricalSecurityPrice[]>(firstResponseMarbles, {}, new Error('failed'))
        : cold<HistoricalSecurityPrice[]>(firstResponseMarbles, {v: firstPrices});
      getHistoricalSecurityPrices.mockReturnValueOnce(first$);
      getHistoricalSecurityPrices.mockReturnValueOnce(cold<HistoricalSecurityPrice[]>(secondResponseMarbles, {v: secondPrices}));
      const source$: HotObservable<LoadBenchmarkPricesArgs> = hot<LoadBenchmarkPricesArgs>(inputMarbles, inputValues);
      loadBenchmarkPricesPipe(
        store,
        {dispatch} as unknown as Store<AppState>,
        {getHistoricalSecurityPrices} as unknown as HistoricalSecurityPriceApi
      )(source$).subscribe();
    });
  }

  it('requests the security\'s prices without a start date in the given currency and stores them', (): void => {
    run();

    expect(getHistoricalSecurityPrices.mock.calls).toEqual([[1, undefined, currency]]);
    expect(patchStateMock.mock.calls).toEqual([[store, {benchmarkPrices: firstPrices}]]);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('stores nothing before the prices arrived', (): void => {
    firstResponseMarbles = '-';

    run();

    expect(patchStateMock).not.toHaveBeenCalled();
  });

  it('clears the prices without a security and requests nothing', (): void => {
    inputMarbles = 'n';

    run();

    expect(getHistoricalSecurityPrices).not.toHaveBeenCalled();
    expect(patchStateMock.mock.calls).toEqual([[store, {benchmarkPrices: []}]]);
  });

  it('drops the request in flight when another security is requested', (): void => {
    inputMarbles = 'a-b';
    firstResponseMarbles = '---(v|)';
    secondResponseMarbles = '--(v|)';

    run();

    expect(getHistoricalSecurityPrices.mock.calls).toEqual([
      [1, undefined, currency],
      [2, undefined,  'USD']
    ]);
    expect(patchStateMock.mock.calls).toEqual([[store, {benchmarkPrices: secondPrices}]]);
  });

  it('clears the prices and notifies once when the load fails', (): void => {
    firstResponseMarbles = '--#';

    run(true);

    expect(patchStateMock.mock.calls).toEqual([[store, {benchmarkPrices: []}]]);
    expect(dispatch.mock.calls).toEqual([[{
      type: '[Notification] Add Error',
      message: 'The historical prices could not be loaded.'
    }]]);
  });

  it('keeps serving requests after a failed load', (): void => {
    inputMarbles = 'a---b';
    firstResponseMarbles = '--#';
    secondResponseMarbles = '--(v|)';

    run(true);

    expect(patchStateMock.mock.calls).toEqual([
      [store, {benchmarkPrices: []}],
      [store, {benchmarkPrices: secondPrices}]
    ]);
  });
});
