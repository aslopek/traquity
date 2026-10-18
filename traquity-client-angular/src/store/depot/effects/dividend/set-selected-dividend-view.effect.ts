import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {selectedDividendView} from '../../depot.selector';
import {dividendSelectedView} from '../../depot-config-keys';
import {DepotActions, SetSelectedDividendViewActionArgs} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {DividendView} from '../../depot.state';
import {clientId} from '../../../client-id';

export type SetSelectedDividendViewEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function setSelectedDividendView(effectArgs: SetSelectedDividendViewEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setSelectedDividendView),
    concatLatestFrom((): Observable<DividendView> => store.select(selectedDividendView)),
    switchMap(([, selectedDividendView]: [SetSelectedDividendViewActionArgs, DividendView]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, dividendSelectedView.key, selectedDividendView).pipe(
        map(() => DepotActions.setSelectedDividendViewDone({selectedView: selectedDividendView})),
        catchError(() => of(DepotActions.setSelectedDividendViewDone({selectedView: selectedDividendView})))
      )
    })
  );
}
