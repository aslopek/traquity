import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../gen/api/configuration';
import {catchError, forkJoin, map, Observable, of, switchMap} from 'rxjs';
import {Action, Store} from '@ngrx/store';
import {DepotActions, SyncDepotConfigActionArgs} from '../depot.actions';
import {AppState, depotSlice} from '../../app.state';
import {clientId} from '../../client-id';
import {concatLatestFrom} from '@ngrx/operators';
import {DepotState} from '../depot.state';

export type SynchronizeDepotConfigEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function synchronizeDepotConfig(effectArgs: SynchronizeDepotConfigEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.syncDepotConfig),
    concatLatestFrom((): Observable<DepotState> => store.select((appState: AppState) => appState[depotSlice])),
    switchMap(([actionArgs, state]: [SyncDepotConfigActionArgs, DepotState]): Observable<Action> => {
      if (actionArgs.depotConfigKeys.length === 0) {
        return of(DepotActions.syncDepotConfigDone(actionArgs));
      }

      const requests: Observable<unknown>[] = [];
      for (const configKey of actionArgs.depotConfigKeys) {
        requests.push(configApi.setClientConfigValue(clientId, configKey.key, configKey.getCurrentValue(state)));
      }

      return forkJoin(requests).pipe(
        map(() => DepotActions.syncDepotConfigDone(actionArgs)),
        catchError(() => of(DepotActions.syncDepotConfigDone(actionArgs)))
      );
    })
  );
}
