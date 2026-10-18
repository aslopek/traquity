import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {DepotActions} from '../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {selectedTab} from '../depot.selector';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {clientId} from '../../client-id';
import {selectedTabIndex} from '../depot-config-keys';
import {DepotTab} from '../depot-tabs';

export type SelectDepotTabEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
}

export function selectDepotTab(effectArgs: SelectDepotTabEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.selectDepotTab),
    concatLatestFrom((): Observable<DepotTab> => store.select(selectedTab)),
    switchMap(([, selectedDepotTab]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, selectedTabIndex.key, `${selectedDepotTab.index}`).pipe(
        map(() => DepotActions.selectDepotTabDone()),
        catchError(() => of(DepotActions.selectDepotTabDone()))
      );
    })
  );
}
