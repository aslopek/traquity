import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, concatMap, forkJoin, from, map, mergeMap, Observable, of} from 'rxjs';
import {SecurityApi, SecurityLogoApi, SecurityRead} from '../../../gen/api/security';
import {CreateSecurityActionArgs, SecurityActions} from '../security.actions';
import {DividendAnnouncementConfigApi} from '../../../gen/api/notification/dividend-announcement';

export type CreateSecurityEffectArgs = {
  actions$: Actions
  securityApi: SecurityApi
  securityLogoApi: SecurityLogoApi
  dividendAnnouncementConfigApi: DividendAnnouncementConfigApi
};

type CreateSecurityResult = {
  actionArgs: CreateSecurityActionArgs
  security?: SecurityRead
}

export function createSecurity(effectArgs: CreateSecurityEffectArgs): Observable<Action> {
  const {
    actions$,
    securityApi
  } = effectArgs;
  return actions$.pipe(
    ofType(SecurityActions.createSecurity),
    concatMap((actionArgs: CreateSecurityActionArgs) =>
      securityApi.createSecurity(actionArgs.security).pipe(
        map((security: SecurityRead): CreateSecurityResult => {
          return {
            security,
            actionArgs
          };
        }),
        catchError((): Observable<CreateSecurityResult> => of({
          actionArgs
        }))
      )
    ),
    concatMap((args: CreateSecurityResult): Observable<Action> => {
      if (!args.security) {
        return of(SecurityActions.createSecurityError(args.actionArgs));
      }

      const {security} = args;
      const {logo, historicalSecurityPriceConfig, dividendAnnouncementConfig} = args.actionArgs;
      const {securityLogoApi, dividendAnnouncementConfigApi} = effectArgs;
      const apiTasks$: Observable<unknown>[] = [];

      // create logo if it exists
      if (logo) {
        apiTasks$.push(
          securityLogoApi.setLogo(security.id, logo).pipe(
            catchError((): Observable<null> => of(null))
          )
        );
      }

      // create dividend announcement config if it exists
      if (dividendAnnouncementConfig) {
        apiTasks$.push(
          dividendAnnouncementConfigApi.createDividendAnnouncementConfig(security.id, dividendAnnouncementConfig).pipe(
            catchError((): Observable<null> => of(null))
          )
        );
      }

      const actions: Action[] = [
        SecurityActions.createSecuritySuccess({security})
      ];

      // create historical security price config if it exists
      if (historicalSecurityPriceConfig) {
        actions.push(SecurityActions.updateHistoricalSecurityPriceConfig({
          securityId: security.id,
          historicalSecurityPriceConfig
        }));
      }

      if (apiTasks$.length > 0) {
        return forkJoin(apiTasks$).pipe(
          mergeMap((): Observable<Action> => from(actions))
        );
      }

      return from(actions);
    })
  );
}
