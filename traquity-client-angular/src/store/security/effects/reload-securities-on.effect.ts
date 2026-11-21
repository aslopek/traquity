import {Actions, ofType} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {concatLatestFrom} from '@ngrx/operators';
import {distinctUntilChanged, filter, map, Observable} from 'rxjs';
import {AppState} from '../../app.state';
import {SecurityActions, SetRequestCurrencyActionArgs} from '../security.actions';
import {securitiesById} from '../security.selector';
import {SecuritiesById} from '../security.state';

export type ReloadSecuritiesOnEffectArgs = {
  actions$: Actions
  store: Store<AppState>
};

export function reloadSecuritiesOn(effectArgs: ReloadSecuritiesOnEffectArgs): Observable<Action> {
  const {actions$, store} = effectArgs;
  return actions$.pipe(
    ofType(SecurityActions.setRequestCurrency),
    map(({currency}: SetRequestCurrencyActionArgs): string => currency),
    distinctUntilChanged(),
    concatLatestFrom((): Observable<SecuritiesById> => store.select(securitiesById)),
    filter(([, securities]: [string, SecuritiesById]): boolean => Object.keys(securities).length > 0),
    map((): Action => SecurityActions.loadAllSecurities())
  );
}
