import {Actions, ofType} from '@ngrx/effects';
import {PaginatedSecurityRead, SecurityApi} from '../../../gen/api/security';
import {Action, Store} from '@ngrx/store';
import {catchError, EMPTY, expand, first, map, Observable, switchMap} from 'rxjs';
import {SecurityActions} from '../security.actions';
import {AppState} from '../../app.state';
import {requestCurrency} from '../security.selector';

export type LoadAllSecuritiesEffectArgs = {
  actions$: Actions
  securityApi: SecurityApi
  store: Store<AppState>
};

const pageSize: number = 100;

function loadPages(securityApi: SecurityApi, currency: string): Observable<Action> {
  return securityApi.getSecurities(0, pageSize, undefined, undefined, undefined, currency).pipe(
    expand((page: PaginatedSecurityRead): Observable<PaginatedSecurityRead> => page.currentPage < page.lastPage
      ? securityApi.getSecurities(page.currentPage + 1, pageSize, undefined, undefined, undefined, currency)
      : EMPTY
    ),
    map((page: PaginatedSecurityRead): Action => SecurityActions.setSecurities({securities: page.items})),
    catchError((): Observable<Action> => EMPTY)
  );
}

export function loadAllSecurities(effectArgs: LoadAllSecuritiesEffectArgs): Observable<Action> {
  const {actions$, securityApi, store} = effectArgs;
  return actions$.pipe(
    ofType(SecurityActions.loadAllSecurities),
    switchMap((): Observable<Action> => store.select(requestCurrency).pipe(
      first((currency: string | null): currency is string => currency !== null),
      switchMap((currency: string): Observable<Action> => loadPages(securityApi, currency))
    ))
  );
}
