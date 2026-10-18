import {Actions, ofType} from '@ngrx/effects';
import {map, Observable} from 'rxjs';
import {Action} from '@ngrx/store';
import {DepotActions} from '../depot.actions';
import {selectedDepotIds} from '../depot-config-keys';

export type DeleteDepotSuccessEffectArgs = {
  actions$: Actions
};

export function deleteDepotSuccess(effectArgs: DeleteDepotSuccessEffectArgs): Observable<Action> {
  const {actions$} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.deleteDepotSuccess),
    map(() => DepotActions.syncDepotConfig({
      depotConfigKeys: [selectedDepotIds]
    }))
  );
}
