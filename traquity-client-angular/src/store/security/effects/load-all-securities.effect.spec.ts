import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {PaginatedSecurityRead, SecurityApi, SecurityRead} from '../../../gen/api/security';
import {AppState} from '../../app.state';
import {securityReadFactory} from '../../../testing/security-read.factory';
import {SecurityActions} from '../security.actions';
import {requestCurrency} from '../security.selector';
import {loadAllSecurities, LoadAllSecuritiesEffectArgs} from './load-all-securities.effect';

type MockedStore = Pick<Store<AppState>, 'select'>;
type MockedSecurityApi = Pick<SecurityApi, 'getSecurities'>;
type GetSecurities = (page?: number, pageSize?: number, order?: unknown, search?: string, orderBy?: unknown,
                      currency?: string) => Observable<PaginatedSecurityRead>;

describe('loadAllSecurities', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let firstPageMarbles: string;
  let secondPageMarbles: string;
  let currencyChangeMarbles: string;
  let firstSecurity: SecurityRead;
  let secondSecurity: SecurityRead;
  let firstPage: PaginatedSecurityRead;
  let secondPage: PaginatedSecurityRead;
  let requestCurrencyInStore: BehaviorSubject<string | null>;
  let requestCurrencyLater: string | null;
  let select: jest.Mock<(selector: unknown) => Observable<string | null>>;
  let getSecurities: jest.Mock<GetSecurities>;
  let effectArgs: Omit<LoadAllSecuritiesEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      getSecurities.mockImplementation((page?: number): Observable<PaginatedSecurityRead> => page === 0
        ? cold(firstPageMarbles, {p: firstPage})
        : cold(secondPageMarbles, {p: secondPage}));
      hot(currencyChangeMarbles).subscribe((): void => requestCurrencyInStore.next(requestCurrencyLater));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = loadAllSecurities({actions$, ...effectArgs});
      expectObservable(effect$.pipe(tap((action: Action): number => emitted.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return emitted;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    firstPageMarbles = '--(p|)';
    secondPageMarbles = '--(p|)';
    currencyChangeMarbles = '';
    firstSecurity = securityReadFactory({id: 1});
    secondSecurity = securityReadFactory({id: 2});

    firstPage = {
      total: 2,
      currentPage: 0,
      lastPage: 1,
      pageSize: 100,
      items: [firstSecurity]
    };

    secondPage = {total: 2,
      currentPage: 1,
      lastPage: 1,
      pageSize: 100,
      items: [secondSecurity]
    };

    requestCurrencyInStore = new BehaviorSubject<string | null>('USD');
    requestCurrencyLater = null;

    // marble alphabet of the action stream: `a` requests a load
    actionValues = {
      a: SecurityActions.loadAllSecurities()
    };

    select = jest.fn((): Observable<string | null> => requestCurrencyInStore);
    getSecurities = jest.fn<GetSecurities>();
    effectArgs = {
      securityApi: {
        // getSecurities has 3 overloads (by `observe`); the mock only implements the one actually called.
        getSecurities: getSecurities as unknown as MockedSecurityApi['getSecurities']
      } satisfies MockedSecurityApi as unknown as SecurityApi,
      store: {select: select as unknown as MockedStore['select']} satisfies MockedStore as Store<AppState>
    };
  });

  it('requests every page in the request currency and sets the securities of each', (): void => {
    const emitted: Action[] = expectEffect('---f-s', {
      f: SecurityActions.setSecurities({securities: [firstSecurity]}),
      s: SecurityActions.setSecurities({securities: [secondSecurity]})
    });

    expect(emitted).toEqual([
      SecurityActions.setSecurities({securities: [firstSecurity]}),
      SecurityActions.setSecurities({securities: [secondSecurity]})
    ]);

    expect(getSecurities.mock.calls).toEqual([
      [0, 100, undefined, undefined, undefined, 'USD'],
      [1, 100, undefined, undefined, undefined, 'USD']
    ]);

    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(requestCurrency);
  });

  it('holds a load arriving while no request currency is set until one is set', (): void => {
    requestCurrencyInStore.next(null);
    currencyChangeMarbles = '---c';
    requestCurrencyLater = 'CHF';

    const emitted: Action[] = expectEffect('-----f-s', {
      f: SecurityActions.setSecurities({securities: [firstSecurity]}),
      s: SecurityActions.setSecurities({securities: [secondSecurity]})
    });

    expect(emitted).toEqual([
      SecurityActions.setSecurities({securities: [firstSecurity]}),
      SecurityActions.setSecurities({securities: [secondSecurity]})
    ]);

    expect(getSecurities.mock.calls).toEqual([
      [0, 100, undefined, undefined, undefined, 'CHF'],
      [1, 100, undefined, undefined, undefined, 'CHF']
    ]);
  });

  it('drops the running load when the next one arrives, which loads in the request currency at its arrival', (): void => {
    actionMarbles = '-a--a';
    currencyChangeMarbles = '--c';
    requestCurrencyLater = 'CHF';

    const emitted: Action[] = expectEffect('---f--f-s', {
      f: SecurityActions.setSecurities({securities: [firstSecurity]}),
      s: SecurityActions.setSecurities({securities: [secondSecurity]})
    });

    expect(emitted).toEqual([
      SecurityActions.setSecurities({securities: [firstSecurity]}),
      SecurityActions.setSecurities({securities: [firstSecurity]}),
      SecurityActions.setSecurities({securities: [secondSecurity]})
    ]);

    expect(getSecurities.mock.calls).toEqual([
      [0, 100, undefined, undefined, undefined, 'USD'],
      [1, 100, undefined, undefined, undefined, 'USD'],
      [0, 100, undefined, undefined, undefined, 'CHF'],
      [1, 100, undefined, undefined, undefined, 'CHF']
    ]);
  });

  it('stops without an action when a page cannot be loaded', (): void => {
    secondPageMarbles = '--#';

    const emitted: Action[] = expectEffect('---f', {
      f: SecurityActions.setSecurities({securities: [firstSecurity]})
    });
    expect(emitted).toEqual([SecurityActions.setSecurities({securities: [firstSecurity]})]);
  });
});
