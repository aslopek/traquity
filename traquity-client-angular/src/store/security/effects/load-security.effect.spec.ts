import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {BehaviorSubject, Observable, of, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {SecurityApi, SecurityRead} from '../../../gen/api/security';
import {AppState} from '../../app.state';
import {securityReadFactory} from '../../../testing/security-read.factory';
import {SecurityActions} from '../security.actions';
import {requestCurrency} from '../security.selector';
import {loadSecurity, LoadSecurityEffectArgs} from './load-security.effect';

type MockedStore = Pick<Store<AppState>, 'select'>;
type MockedSecurityApi = Pick<SecurityApi, 'getSecurity'>;
type GetSecurity = (id: number, currency?: string) => Observable<SecurityRead>;

describe('loadSecurity', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let responseMarbles: string;
  let currencyChangeMarbles: string;
  let security: SecurityRead;
  let securityInStore: SecurityRead | null;
  let requestCurrencyInStore: BehaviorSubject<string | null>;
  let requestCurrencyLater: string | null;
  let getSecurity: jest.Mock<GetSecurity>;
  let effectArgs: LoadSecurityEffectArgs;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      getSecurity.mockReturnValue(cold(responseMarbles, {s: security}));
      hot(currencyChangeMarbles).subscribe((): void => requestCurrencyInStore.next(requestCurrencyLater));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = loadSecurity(actions$, effectArgs);
      expectObservable(effect$.pipe(tap((action: Action): number => emitted.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return emitted;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    responseMarbles = '--(s|)';
    currencyChangeMarbles = '';
    security = securityReadFactory({id: 1});
    securityInStore = null;
    requestCurrencyInStore = new BehaviorSubject<string | null>('USD');
    requestCurrencyLater = null;

    // marble alphabet of the action stream: `a` loads a security
    actionValues = {
      a: SecurityActions.loadSecurity({securityId: 1})
    };

    getSecurity = jest.fn<GetSecurity>();
    effectArgs = {
      securityApi: {
        // getSecurity has 3 overloads (by `observe`); the mock only implements the one actually called.
        getSecurity: getSecurity as unknown as MockedSecurityApi['getSecurity']
      } satisfies MockedSecurityApi as unknown as SecurityApi,
      store: {
        select: jest.fn((selector: unknown): Observable<unknown> =>
          selector === requestCurrency ? requestCurrencyInStore : of(securityInStore)) as unknown as MockedStore['select']
      } satisfies MockedStore as Store<AppState>
    };
  });

  it('loads a security that is not in the store in the request currency', (): void => {
    const emitted: Action[] = expectEffect('---s', {s: SecurityActions.loadSecuritySuccess({security: securityReadFactory({id: 1})})});
    expect(emitted).toEqual([SecurityActions.loadSecuritySuccess({security: securityReadFactory({id: 1})})]);
    expect(getSecurity).toHaveBeenCalledTimes(1);
    expect(getSecurity).toHaveBeenCalledWith(1, 'USD');
  });

  it('holds a load arriving while no request currency is set until one is set', (): void => {
    requestCurrencyInStore.next(null);
    currencyChangeMarbles = '---c';
    requestCurrencyLater = 'CHF';

    const emitted: Action[] = expectEffect('-----s', {
      s: SecurityActions.loadSecuritySuccess({security: securityReadFactory({id: 1})})
    });
    expect(emitted).toEqual([SecurityActions.loadSecuritySuccess({
      security: securityReadFactory({id: 1})
    })]);
    expect(getSecurity).toHaveBeenCalledTimes(1);
    expect(getSecurity).toHaveBeenCalledWith(1, 'CHF');
  });

  it('answers with an error without a request when the security is already in the store', (): void => {
    securityInStore = securityReadFactory({id: 1});

    const emitted: Action[] = expectEffect('-e', {
      e: SecurityActions.loadSecurityError({securityId: 1})
    });
    expect(emitted).toEqual([SecurityActions.loadSecurityError({securityId: 1})]);
    expect(getSecurity).not.toHaveBeenCalled();
  });

  it('answers with an error when the request fails', (): void => {
    responseMarbles = '--#';

    const emitted: Action[] = expectEffect('---e', {
      e: SecurityActions.loadSecurityError({securityId: 1})
    });
    expect(emitted).toEqual([SecurityActions.loadSecurityError({securityId: 1})]);
  });
});
