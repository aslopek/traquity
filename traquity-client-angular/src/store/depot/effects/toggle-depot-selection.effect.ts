import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {DepotActions, ToggleDepotSelectionActionArgs} from '../depot.actions';
import {clientId} from '../../client-id';
import {selectedDepotIds as selectedDepotIdsConfigKey} from '../depot-config-keys';
import {concatLatestFrom} from '@ngrx/operators';
import {selectedDepotIds} from '../depot.selector';

export type ChangeDepotSelectionEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function toggleDepotSelection(effectArgs: ChangeDepotSelectionEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.toggleDepotSelection),
    concatLatestFrom((): Observable<number[]> => store.select(selectedDepotIds)),
    switchMap(([, selectedDepotIdsInState]: [ToggleDepotSelectionActionArgs, number[]]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, selectedDepotIdsConfigKey.key, JSON.stringify(selectedDepotIdsInState)).pipe(
        map(() => DepotActions.toggleDepotSelectionDone()),
        catchError(() => of(DepotActions.toggleDepotSelectionDone()))
      )
    })
  );
}
