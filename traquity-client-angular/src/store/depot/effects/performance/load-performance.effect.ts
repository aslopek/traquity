import {Actions, ofType} from '@ngrx/effects';
import {DepotPerformance, DepotPerformanceApi} from '../../../../gen/api/depot-performance';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {ActionsTriggeringPerformanceDataReload, DepotActions} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {selectedDepotIds} from '../../depot.selector';

export type LoadPerformanceEffectArgs = {
  actions$: Actions
  depotPerformanceApi: DepotPerformanceApi
  store: Store<AppState>
};

export function loadPerformance(effectArgs: LoadPerformanceEffectArgs): Observable<Action> {
  const {actions$, depotPerformanceApi, store} = effectArgs;
  return actions$.pipe(
    ofType(...ActionsTriggeringPerformanceDataReload),
    concatLatestFrom((): Observable<number[]> => store.select(selectedDepotIds)),
    switchMap(([, depotIds]: [unknown, number[]]): Observable<Action> => {
      return depotPerformanceApi.getDepotPerformance(depotIds).pipe(
        map((depotPerformance: DepotPerformance): Action => DepotActions.loadPerformanceDone({depotPerformance})),
        catchError((): Observable<Action> => of(DepotActions.loadPerformanceDone({depotPerformance: null})))
      );
    })
  );
}
