import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {SecurityApi, SecurityRead, SecurityType, SecurityUpdate} from '../../../gen/api/security';
import {AppState} from '../../app.state';
import {securityReadFactory} from '../../../testing/security-read.factory';
import {SecurityActions, UpdateSecurityActionArgs} from '../security.actions';
import {requestCurrency} from '../security.selector';
import {updateSecurity, UpdateSecurityEffectArgs} from './update-security.effect';

type MockedStore = Pick<Store<AppState>, 'select'>;
type MockedSecurityApi = Pick<SecurityApi, 'updateSecurity'>;
type UpdateSecurity = (id: number, securityUpdate: SecurityUpdate, currency?: string) => Observable<SecurityRead>;

describe('updateSecurity', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let responseMarbles: string;
  let storeChangeMarbles: string;
  let currencyChangeMarbles: string;
  let values: UpdateSecurityActionArgs['values'];
  let updatedSecurity: SecurityRead;
  let securityInStore: BehaviorSubject<SecurityRead | null>;
  let securityInStoreLater: SecurityRead | null;
  let requestCurrencyInStore: BehaviorSubject<string | null>;
  let requestCurrencyLater: string | null;
  let updateSecurityApi: jest.Mock<UpdateSecurity>;
  let effectArgs: UpdateSecurityEffectArgs;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      updateSecurityApi.mockReturnValue(cold(responseMarbles, {s: updatedSecurity}));
      hot(storeChangeMarbles).subscribe((): void => securityInStore.next(securityInStoreLater));
      hot(currencyChangeMarbles).subscribe((): void => requestCurrencyInStore.next(requestCurrencyLater));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = updateSecurity(actions$, effectArgs);
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
    storeChangeMarbles = '';
    currencyChangeMarbles = '';

    values = {
      isin: 'US0378331005',
      symbols: ['AAPL'],
      name: 'Apple',
      securityType: SecurityType.STOCK
    };

    updatedSecurity = securityReadFactory({
      id: 1,
      name: 'Apple',
      version: 1
    });

    securityInStore = new BehaviorSubject<SecurityRead | null>(securityReadFactory({
      id: 1,
      version: 0
    }));

    securityInStoreLater = null;
    requestCurrencyInStore = new BehaviorSubject<string | null>('USD');
    requestCurrencyLater = null;

    // marble alphabet of the action stream: `a` and `b` update the same security
    actionValues = {
      a: SecurityActions.updateSecurity({id: 1, values}),
      b: SecurityActions.updateSecurity({id: 1, values: {...values, name: 'Apple Inc.'}})
    };

    updateSecurityApi = jest.fn<UpdateSecurity>();
    effectArgs = {
      securityApi: {
        updateSecurity: updateSecurityApi as unknown as MockedSecurityApi['updateSecurity']
      } satisfies MockedSecurityApi as unknown as SecurityApi,
      store: {
        select: jest.fn((selector: unknown): Observable<unknown> =>
          selector === requestCurrency ? requestCurrencyInStore : securityInStore) as unknown as MockedStore['select']
      } satisfies MockedStore as Store<AppState>
    };
  });

  it('updates the security at its stored version and answers in the request currency', (): void => {
    const emitted: Action[] = expectEffect('---s', {
      s: SecurityActions.updateSecuritySuccess({security: securityReadFactory({id: 1, name: 'Apple', version: 1})})
    });
    expect(emitted).toEqual([SecurityActions.updateSecuritySuccess({security: securityReadFactory({id: 1, name: 'Apple', version: 1})})]);
    expect(updateSecurityApi).toHaveBeenCalledTimes(1);
    expect(updateSecurityApi).toHaveBeenCalledWith(1, {
      isin: 'US0378331005',
      symbols: ['AAPL'],
      name: 'Apple',
      securityType: SecurityType.STOCK,
      version: 0
    }, 'USD');
  });

  it('holds an update arriving while no request currency is set until one is set', (): void => {
    requestCurrencyInStore.next(null);
    currencyChangeMarbles = '---c';
    requestCurrencyLater = 'CHF';

    const emitted: Action[] = expectEffect('-----s', {
      s: SecurityActions.updateSecuritySuccess({security: securityReadFactory({id: 1, name: 'Apple', version: 1})})
    });
    expect(emitted).toEqual([SecurityActions.updateSecuritySuccess({security: securityReadFactory({id: 1, name: 'Apple', version: 1})})]);
    expect(updateSecurityApi).toHaveBeenCalledTimes(1);
    expect(updateSecurityApi).toHaveBeenCalledWith(1, {
      isin: 'US0378331005',
      symbols: ['AAPL'],
      name: 'Apple',
      securityType: SecurityType.STOCK,
      version: 0
    }, 'CHF');
  });

  it('answers with an error without a request when the security is not in the store', (): void => {
    securityInStore.next(null);

    const emitted: Action[] = expectEffect('-e', {e: SecurityActions.updateSecurityError()});
    expect(emitted).toEqual([SecurityActions.updateSecurityError()]);
    expect(updateSecurityApi).not.toHaveBeenCalled();
  });

  it('answers with an error when the request fails', (): void => {
    responseMarbles = '--#';

    const emitted: Action[] = expectEffect('---e', {e: SecurityActions.updateSecurityError()});
    expect(emitted).toEqual([SecurityActions.updateSecurityError()]);
  });

  it('sends a queued update at the version stored once the update before it finished', (): void => {
    actionMarbles = '-a-b';
    responseMarbles = '---s-|';
    storeChangeMarbles = '-----v';
    securityInStoreLater = securityReadFactory({id: 1, name: 'Apple', version: 1});

    const emitted: Action[] = expectEffect('----s----s', {
      s: SecurityActions.updateSecuritySuccess({security: securityReadFactory({id: 1, name: 'Apple', version: 1})})
    });
    expect(emitted).toEqual([
      SecurityActions.updateSecuritySuccess({security: securityReadFactory({id: 1, name: 'Apple', version: 1})}),
      SecurityActions.updateSecuritySuccess({security: securityReadFactory({id: 1, name: 'Apple', version: 1})})
    ]);
    expect(updateSecurityApi.mock.calls).toEqual([
      [1, {isin: 'US0378331005', symbols: ['AAPL'], name: 'Apple', securityType: SecurityType.STOCK, version: 0}, 'USD'],
      [1, {isin: 'US0378331005', symbols: ['AAPL'], name: 'Apple Inc.', securityType: SecurityType.STOCK, version: 1}, 'USD']
    ]);
  });
});
