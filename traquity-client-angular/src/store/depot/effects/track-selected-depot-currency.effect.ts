import {Actions, ofType} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {concatLatestFrom} from '@ngrx/operators';
import {distinctUntilChanged, map, Observable} from 'rxjs';
import {AppState} from '../../app.state';
import {DepotActions} from '../depot.actions';
import {selectedDepotCurrency} from '../depot.selector';

export type TrackSelectedDepotCurrencyEffectArgs = {
  actions$: Actions
  store: Store<AppState>
};

/**
 * Announces changes to the currency of the selected depot(s).
 *
 * @param effectArgs the action stream and the store to read the currency from
 * @returns a `Selected Depot Currency Changed` action per announced currency
 */
export function trackSelectedDepotCurrency(effectArgs: TrackSelectedDepotCurrencyEffectArgs): Observable<Action> {
  const {actions$, store} = effectArgs;
  return actions$.pipe(
    ofType(
      DepotActions.setDepotsSlice,
      DepotActions.addDepotSuccess,
      DepotActions.deleteDepotSuccess,
      DepotActions.toggleDepotSelection
    ),
    concatLatestFrom((): Observable<string> => store.select(selectedDepotCurrency)),
    map(([, currency]: [Action, string]): string => currency),
    distinctUntilChanged(),
    map((currency: string): Action => DepotActions.selectedDepotCurrencyChanged({currency}))
  );
}
