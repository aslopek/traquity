import {Actions, ofType} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {concatLatestFrom} from '@ngrx/operators';
import {catchError, concatMap, first, map, Observable, of} from 'rxjs';
import {SecurityApi, SecurityRead, SecurityUpdate} from '../../../gen/api/security';
import {SecurityActions, UpdateSecurityActionArgs} from '../security.actions';
import {getSecurity, requestCurrency} from '../security.selector';
import {AppState} from '../../app.state';

export type UpdateSecurityEffectArgs = {
  store: Store<AppState>
  securityApi: SecurityApi
};

/**
 * Updates a loaded security at its stored version, one update after the other, and answers in the request currency. An update waits
 * until a request currency is set.
 *
 * @param actions$ the action stream
 * @param effectArgs the store to read from and the security API to update with
 * @returns an `Update Security Success` or `Update Security Error` action per update
 */
export function updateSecurity(actions$: Actions, effectArgs: UpdateSecurityEffectArgs): Observable<Action> {
  const {store, securityApi} = effectArgs;
  return actions$.pipe(
    ofType(SecurityActions.updateSecurity),
    // the store is read inside concatMap: a queued update has to send the version that the update before it stored, not the one known
    // when it was queued
    concatMap(({id, values}: UpdateSecurityActionArgs): Observable<Action> => store.select(requestCurrency).pipe(
      first((currency: string | null): currency is string => currency !== null),
      concatLatestFrom((): Observable<SecurityRead | null> => store.select(getSecurity(id))),
      concatMap(([currency, security]: [string, SecurityRead | null]): Observable<Action> => {
        if (security === null) {
          return of(SecurityActions.updateSecurityError());
        }

        const securityUpdate: SecurityUpdate = {
          version: security.version,
          ...values
        };

        return securityApi.updateSecurity(id, securityUpdate, currency).pipe(
          map((updatedSecurity: SecurityRead): Action => SecurityActions.updateSecuritySuccess({security: updatedSecurity})),
          catchError((): Observable<Action> => of(SecurityActions.updateSecurityError()))
        );
      })
    ))
  );
}
