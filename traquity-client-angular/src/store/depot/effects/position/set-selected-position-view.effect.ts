import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DepotActions, SetSelectedPositionViewActionArgs} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {PositionView} from '../../depot.state';
import {selectedPositionView} from '../../depot.selector';
import {clientId} from '../../../client-id';
import {positionSelectedView} from '../../depot-config-keys';

export type SetSelectedPositionViewEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function setSelectedPositionView(effectArgs: SetSelectedPositionViewEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setSelectedPositionView),
    concatLatestFrom((): Observable<PositionView> => store.select(selectedPositionView)),
    switchMap(([, selectedView]: [SetSelectedPositionViewActionArgs, PositionView]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, positionSelectedView.key, `${selectedView}`).pipe(
        map(() => DepotActions.setSelectedPositionViewDone({selectedView})),
        catchError(() => of(DepotActions.setSelectedPositionViewDone({selectedView})))
      )
    })
  );
}
