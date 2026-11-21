import {WritableSignalStore} from '../../../common/types/signal-store.type';
import {SearchParams, SecurityPageState} from '../security-page.store';
import {Store} from '@ngrx/store';
import {AppState} from '../../../store/app.state';
import {PaginatedSecurityRead, SecurityApi} from '../../../gen/api/security';
import {catchError, EMPTY, Observable, take} from 'rxjs';
import {SecurityActions} from '../../../store/security/security.actions';
import {requestCurrency} from '../../../store/security/security.selector';
import {patchState} from '@ngrx/signals';

/**
 * @param signalStore the store to keep the page and the search in
 * @param globalStore the store to read the request parameters from and to set the loaded securities in
 * @param securityApi the security API to load from
 * @param pageIndex the index of the page to load
 * @param searchParams the search the securities have to match
 */
export function loadPage(signalStore: WritableSignalStore<SecurityPageState>,
                         globalStore: Store<AppState>,
                         securityApi: SecurityApi,
                         pageIndex: number,
                         searchParams: SearchParams): void {
  const currency: string | null = globalStore.selectSignal(requestCurrency)();
  if (currency === null) {
    return;
  }

  securityApi.getSecurities(pageIndex, undefined, undefined, searchParams.search ?? undefined, undefined, currency).pipe(
    take(1),
    catchError((): Observable<never> => EMPTY)
  ).subscribe((page: PaginatedSecurityRead): void => {
    globalStore.dispatch(SecurityActions.setSecurities({securities: page.items}));
    patchState(signalStore, {page, searchParams});
  });
}
