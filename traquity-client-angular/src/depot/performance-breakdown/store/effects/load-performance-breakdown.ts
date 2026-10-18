import {RxMethod, rxMethod} from '@ngrx/signals/rxjs-interop';
import {catchError, EMPTY, map, Observable, pipe, switchMap, tap} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {AppState} from '../../../../store/app.state';
import {NotificationActions} from '../../../../store/notification/notification.actions';
import {DepotPerformancePositionApi, PositionPerformance} from '../../../../gen/api/depot-performance';
import {initialState, PerformanceBreakdownState} from '../performance-breakdown.store';

export type LoadPerformanceBreakdownArgs = {
  depotIds: number[]
  securityIds: number[] | undefined
};

export function loadPerformanceBreakdown(signalStore: WritableSignalStore<PerformanceBreakdownState>,
                                         api: Pick<DepotPerformancePositionApi, 'getPositionPerformance'>,
                                         globalStore: Store<AppState>): RxMethod<LoadPerformanceBreakdownArgs> {
  return rxMethod<LoadPerformanceBreakdownArgs>(loadPerformanceBreakdownPipe(signalStore, api, globalStore));
}

export function loadPerformanceBreakdownPipe(signalStore: WritableSignalStore<PerformanceBreakdownState>,
                                             api: Pick<DepotPerformancePositionApi, 'getPositionPerformance'>,
                                             globalStore: Store<AppState>):
  (source$: Observable<LoadPerformanceBreakdownArgs>) => Observable<void> {
  return pipe(
    tap((): void => patchState(signalStore, {...initialState})), // clear the state before a request
    switchMap((args: LoadPerformanceBreakdownArgs): Observable<void> =>
      api.getPositionPerformance(args.depotIds, args.securityIds).pipe(
        tap((performance: PositionPerformance): void => patchState(signalStore, {performance, loadFailed: false})),
        map((): void => undefined),
        catchError((): Observable<void> => {
          patchState(signalStore, {performance: null, loadFailed: true});
          globalStore.dispatch(NotificationActions.addError({message: 'The performance breakdown could not be loaded'}));
          return EMPTY;
        })
      ))
  );
}
