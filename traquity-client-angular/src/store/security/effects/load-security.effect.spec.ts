import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {firstValueFrom, Observable, of, throwError} from 'rxjs';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {loadSecurity, LoadSecurityEffectArgs} from './load-security.effect';
import {SecurityActions} from '../security.actions';
import {SecurityApi, SecurityRead} from '../../../gen/api/security';
import {AppState} from '../../app.state';
import {securityReadFactory} from '../../../testing/security-read.factory';

type MockedStore = Pick<Store<AppState>, 'selectSignal'>;
type MockedSecurityApi = Pick<SecurityApi, 'getSecurity'>;

describe('loadSecurity', (): void => {
  let security: SecurityRead;
  let getSecurityFromStore: jest.Mock<() => SecurityRead | null>;
  let getSecurityFromApi: jest.Mock<(id: number) => Observable<SecurityRead>>;
  let store: Store<AppState>;
  let securityApi: SecurityApi;
  let effectArgs: LoadSecurityEffectArgs;
  let actions$: Actions;

  beforeEach((): void => {
    security = securityReadFactory();

    getSecurityFromStore = jest.fn((): SecurityRead | null => null);
    store = {
      selectSignal: jest.fn().mockReturnValue(getSecurityFromStore) as MockedStore['selectSignal']
    } satisfies MockedStore as Store<AppState>;

    getSecurityFromApi = jest.fn((): Observable<SecurityRead> => of(security));
    securityApi = {
      // getSecurity has 3 overloads (by `observe`); the mock only implements the one actually called.
      getSecurity: getSecurityFromApi as unknown as MockedSecurityApi['getSecurity']
    } satisfies MockedSecurityApi as unknown as SecurityApi;

    effectArgs = {
      securityApi,
      store
    };

    actions$ = new Actions(of(SecurityActions.loadSecurity({securityId: security.id})));
  });

  it('dispatches Load Security Success when the security is not in the store and the API call succeeds', async (): Promise<void> => {
    const result: Action = await firstValueFrom(loadSecurity(actions$, effectArgs));
    expect(result).toEqual(SecurityActions.loadSecuritySuccess({security}));
  });

  it('dispatches Load Security Error without calling the API when the security is already in the store', async (): Promise<void> => {
    getSecurityFromStore.mockReturnValue(security);
    const result: Action = await firstValueFrom(loadSecurity(actions$, effectArgs));
    expect(result).toEqual(SecurityActions.loadSecurityError({securityId: security.id}));
    expect(getSecurityFromApi).not.toHaveBeenCalled();
  });

  it('dispatches Load Security Error when the API call fails', async (): Promise<void> => {
    getSecurityFromApi.mockReturnValue(throwError((): Error => new Error('network error')));
    const result: Action = await firstValueFrom(loadSecurity(actions$, effectArgs));
    expect(result).toEqual(SecurityActions.loadSecurityError({securityId: security.id}));
  });
});
