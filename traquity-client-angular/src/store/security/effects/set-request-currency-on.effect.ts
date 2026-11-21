import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {distinctUntilChanged, map, Observable} from 'rxjs';
import {DepotActions, SelectedDepotCurrencyChangedActionArgs} from '../../depot/depot.actions';
import {SecurityActions} from '../security.actions';

export type SetRequestCurrencyOnEffectArgs = {
  actions$: Actions
};

export function setRequestCurrencyOn(effectArgs: SetRequestCurrencyOnEffectArgs): Observable<Action> {
  const {actions$} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.selectedDepotCurrencyChanged),
    map(({currency}: SelectedDepotCurrencyChangedActionArgs): string => currency),
    distinctUntilChanged(),
    map((currency: string): Action => SecurityActions.setRequestCurrency({currency}))
  );
}
