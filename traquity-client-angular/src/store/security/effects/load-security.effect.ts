import {Action, Store} from '@ngrx/store';
import {Actions, ofType} from '@ngrx/effects';
import {concatLatestFrom} from '@ngrx/operators';
import {catchError, first, map, mergeMap, Observable, of} from 'rxjs';
import {SecurityApi, SecurityRead} from '../../../gen/api/security';
import {LoadSecurityActionArgs, SecurityActions} from '../security.actions';
import {AppState} from '../../app.state';
import {getSecurity, requestCurrency} from '../security.selector';

export type LoadSecurityEffectArgs = {
  securityApi: SecurityApi
  store: Store<AppState>
};

/**
 * @param actions$ the action stream
 * @param effectArgs the security API to load from and the store to read from
 * @returns a `Load Security Success` or `Load Security Error` action per load
 */
export function loadSecurity(actions$: Actions, effectArgs: LoadSecurityEffectArgs): Observable<Action> {
  const {securityApi, store} = effectArgs;
  return actions$.pipe(
    ofType(SecurityActions.loadSecurity),
    mergeMap(({securityId}: LoadSecurityActionArgs): Observable<Action> => store.select(requestCurrency).pipe(
      first((currency: string | null): currency is string => currency !== null),
      concatLatestFrom((): Observable<SecurityRead | null> => store.select(getSecurity(securityId))),
      mergeMap(([currency, knownSecurity]: [string, SecurityRead | null]): Observable<Action> => {
        if (knownSecurity !== null) {
          return of(SecurityActions.loadSecurityError({securityId}));
        }

        return securityApi.getSecurity(securityId, currency).pipe(
          map((security: SecurityRead): Action => SecurityActions.loadSecuritySuccess({security})),
          catchError((): Observable<Action> => of(SecurityActions.loadSecurityError({securityId})))
        );
      })
    ))
  );
}
