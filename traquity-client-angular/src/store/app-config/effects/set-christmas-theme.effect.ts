import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, concatMap, map, Observable, of} from 'rxjs';
import {ConfigApi} from '../../../gen/api/configuration';
import {clientId} from '../../client-id';
import {AppChristmasTheme} from '../app-config-keys';
import {AppConfigActions} from '../app-config.actions';

export type SetChristmasThemeEffectArgs = {
  actions$: Actions
  configApi: Pick<ConfigApi, 'setClientConfigValue'>
};

export function setChristmasTheme(effectArgs: SetChristmasThemeEffectArgs): Observable<Action> {
  const {actions$, configApi} = effectArgs;
  return actions$.pipe(
    ofType(AppConfigActions.setChristmasTheme),
    concatMap(({christmasTheme}: {christmasTheme: boolean}): Observable<Action> =>
      configApi.setClientConfigValue(clientId, AppChristmasTheme.key, `${christmasTheme}`).pipe(
        map((): Action => AppConfigActions.setChristmasThemeDone({christmasTheme})),
        catchError((): Observable<Action> => of(AppConfigActions.setChristmasThemeDone({christmasTheme})))
      ))
  );
}
