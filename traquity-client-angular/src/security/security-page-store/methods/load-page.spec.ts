import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal} from '@angular/core';
import {patchState} from '@ngrx/signals';
import {Action, Store} from '@ngrx/store';
import {Observable, of, throwError} from 'rxjs';
import {WritableSignalStore} from '../../../common/types/signal-store.type';
import {PaginatedSecurityRead, SecurityApi} from '../../../gen/api/security';
import {AppState} from '../../../store/app.state';
import {SecurityActions} from '../../../store/security/security.actions';
import {requestCurrency} from '../../../store/security/security.selector';
import {securityReadFactory} from '../../../testing/security-read.factory';
import {SearchParams, SecurityPageState} from '../security-page.store';
import {loadPage} from './load-page';

jest.mock('@ngrx/signals', (): unknown => ({
  ...jest.requireActual<object>('@ngrx/signals'),
  patchState: jest.fn()
}));

type PatchState = (store: unknown, update: Partial<SecurityPageState>) => void;
type MockedStore = Pick<Store<AppState>, 'dispatch' | 'selectSignal'>;
type MockedSecurityApi = Pick<SecurityApi, 'getSecurities'>;
type GetSecurities = (page?: number, pageSize?: number, order?: unknown, search?: string, orderBy?: unknown,
                      currency?: string) => Observable<PaginatedSecurityRead>;

describe('loadPage', (): void => {
  let patchStateMock: jest.Mock<PatchState>;
  let dispatch: jest.Mock<(action: Action) => void>;
  let selectSignal: jest.Mock<(selector: unknown) => unknown>;
  let requestCurrencyInStore: string | null;
  let getSecurities: jest.Mock<GetSecurities>;
  let page: PaginatedSecurityRead;
  let searchParams: SearchParams;
  let signalStore: WritableSignalStore<SecurityPageState>;
  let globalStore: Store<AppState>;
  let securityApi: SecurityApi;

  beforeEach((): void => {
    patchStateMock = patchState as unknown as jest.Mock<PatchState>;
    patchStateMock.mockReset();

    page = {
      total: 30,
      currentPage: 1,
      lastPage: 1,
      pageSize: 25,
      items: [
        securityReadFactory({id: 1})
      ]
    };
    searchParams = {search: 'apple'};
    requestCurrencyInStore = 'USD';

    dispatch = jest.fn<(action: Action) => void>();
    selectSignal = jest.fn((): unknown => signal(requestCurrencyInStore));
    globalStore = {
      dispatch: dispatch as unknown as MockedStore['dispatch'],
      selectSignal: selectSignal as MockedStore['selectSignal']
    } satisfies MockedStore as unknown as Store<AppState>;

    getSecurities = jest.fn<GetSecurities>((): Observable<PaginatedSecurityRead> => of(page));
    securityApi = {
      getSecurities: getSecurities as unknown as MockedSecurityApi['getSecurities']
    } satisfies MockedSecurityApi as unknown as SecurityApi;

    signalStore = {} as WritableSignalStore<SecurityPageState>;
  });

  it('loads the page of the search in the request currency and keeps it with the search', (): void => {
    loadPage(signalStore, globalStore, securityApi, 1, searchParams);

    expect(selectSignal.mock.calls).toEqual([[requestCurrency]]);
    expect(getSecurities.mock.calls).toEqual([[1, undefined, undefined, 'apple', undefined, 'USD']]);
    expect(dispatch.mock.calls).toEqual([[SecurityActions.setSecurities({securities: [securityReadFactory({id: 1})]})]]);
    expect(patchStateMock.mock.calls).toEqual([[signalStore, {
      page,
      searchParams
    }]]);
  });

  it('loads the page of all securities without a search', (): void => {
    searchParams = {search: null};

    loadPage(signalStore, globalStore, securityApi, 1, searchParams);

    expect(getSecurities.mock.calls).toEqual([[1, undefined, undefined, undefined, undefined, 'USD']]);
  });

  it('loads nothing while no request currency is set', (): void => {
    requestCurrencyInStore = null;

    loadPage(signalStore, globalStore, securityApi, 1, searchParams);

    expect(getSecurities).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(patchStateMock).not.toHaveBeenCalled();
  });

  it('keeps the store unchanged when the page cannot be loaded', (): void => {
    getSecurities.mockReturnValue(throwError((): Error => new Error('request failed')));

    loadPage(signalStore, globalStore, securityApi, 1, searchParams);

    expect(dispatch).not.toHaveBeenCalled();
    expect(patchStateMock).not.toHaveBeenCalled();
  });
});
