import {Actions, ofType} from '@ngrx/effects';
import {map, Observable} from 'rxjs';
import {DepotActions} from '../depot.actions';
import {selectedDepotIds, selectedTabIndex} from '../depot-config-keys';
import {Action} from '@ngrx/store';

export type AddDepotSuccessEffectArgs = {
  actions$: Actions
};

export function addDepotSuccess(effectArgs: AddDepotSuccessEffectArgs): Observable<Action> {
  const {actions$} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.addDepotSuccess),
    map(() => DepotActions.syncDepotConfig({
      depotConfigKeys: [
        selectedDepotIds,
        selectedTabIndex
      ]
    }))
  );
}