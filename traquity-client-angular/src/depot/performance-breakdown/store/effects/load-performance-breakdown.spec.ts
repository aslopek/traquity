import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {signalState, SignalState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {NotificationActions} from '../../../../store/notification/notification.actions';
import {DepotPerformancePositionApi, PositionPerformance} from '../../../../gen/api/depot-performance';
import {positionPerformanceFactory} from '../../../../testing/position-performance.factory';
import {initialState, PerformanceBreakdownState} from '../performance-breakdown.store';
import {loadPerformanceBreakdownPipe, LoadPerformanceBreakdownArgs} from './load-performance-breakdown';

type GetPositionPerformance = (depotIds: number[], securityIds?: number[]) => Observable<PositionPerformance>;
type MockedApi = Pick<DepotPerformancePositionApi, 'getPositionPerformance'>;
type MockedStore = Pick<Store<AppState>, 'dispatch'>;

describe('loadPerformanceBreakdownPipe', (): void => {
  let scheduler: TestScheduler;
  let store: SignalState<PerformanceBreakdownState>;
  let getPositionPerformanceMock: jest.Mock<GetPositionPerformance>;
  let api: MockedApi;
  let dispatchMock: jest.Mock<Store<AppState>['dispatch']>;
  let globalStore: MockedStore;
  let response: PositionPerformance;
  let inputMarbles: string;
  let inputValues: Record<string, LoadPerformanceBreakdownArgs>;
  let responseMarbles: string;
  let responseValues: Record<string, PositionPerformance>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<PerformanceBreakdownState>({...initialState});

    getPositionPerformanceMock = jest.fn<GetPositionPerformance>();
    api = {getPositionPerformance: getPositionPerformanceMock as unknown as MockedApi['getPositionPerformance']};

    dispatchMock = jest.fn() as jest.Mock<Store<AppState>['dispatch']>;
    globalStore = {dispatch: dispatchMock as unknown as MockedStore['dispatch']};

    response = positionPerformanceFactory();

    inputMarbles = 'a';
    inputValues = {a: {depotIds: [1], securityIds: [2]}};
    responseMarbles = '---(v|)';
    responseValues = {v: response};
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      getPositionPerformanceMock.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<LoadPerformanceBreakdownArgs> = hot<LoadPerformanceBreakdownArgs>(inputMarbles, inputValues);
      loadPerformanceBreakdownPipe(store, api, globalStore as Store<AppState>)(source$).subscribe();
    });
  }

  it('requests the position performance for the given ids and stores the response', (): void => {
    run();

    expect(getPositionPerformanceMock).toHaveBeenCalledTimes(1);
    expect(getPositionPerformanceMock).toHaveBeenCalledWith([1], [2]);
    expect(store.performance()).toEqual(response);
    expect(store.loadFailed()).toBe(false);
  });

  it('patches loadFailed and dispatches exactly one error notification on failure', (): void => {
    responseMarbles = '---#';

    run();

    expect(store.performance()).toBeNull();
    expect(store.loadFailed()).toBe(true);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      NotificationActions.addError({message: 'The performance breakdown could not be loaded'}));
  });

  it('drops an in-flight request once a newer one arrives', (): void => {
    const dropped: PositionPerformance = positionPerformanceFactory({costBasis: 1});
    const latest: PositionPerformance = positionPerformanceFactory({costBasis: 2});

    scheduler.run(({cold, hot}: RunHelpers): void => {
      getPositionPerformanceMock
        .mockReturnValueOnce(cold('-----(v|)', {v: dropped}))
        .mockReturnValueOnce(cold('-(w|)', {w: latest}));

      const source$: HotObservable<LoadPerformanceBreakdownArgs> = hot<LoadPerformanceBreakdownArgs>('a-b', {
        a: {depotIds: [1], securityIds: [2]},
        b: {depotIds: [3], securityIds: undefined}
      });
      loadPerformanceBreakdownPipe(store, api, globalStore as Store<AppState>)(source$).subscribe();
    });

    expect(getPositionPerformanceMock.mock.calls).toEqual([
      [[1], [2]],
      [[3], undefined]
    ]);
    expect(store.performance()).toEqual(latest);
  });
});
