import {PaginatedSecurityRead, SecurityApi} from '../../gen/api/security';
import {ReadableSignalStore, WritableSignalStore} from '../../common/types/signal-store.type';
import {signalStore, withComputed, withHooks, withMethods, withState} from '@ngrx/signals';
import {AppState} from '../../store/app.state';
import {Store} from '@ngrx/store';
import {DestroyRef, inject} from '@angular/core';
import {loadPage} from './methods/load-page';
import {initialize} from './methods/initialize';
import {search} from './methods/search';
import {hoverSecurity} from './methods/hover-security';
import {Actions, ofType} from '@ngrx/effects';
import {SecurityActions} from '../../store/security/security.actions';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

type Computed = {};

type Methods = {
  hoverSecurity: (securityId: number | null) => void
  initialize: () => void
  loadPage: (pageIndex: number) => void
  search: (search?: string) => void
};

export type SearchParams = {
  search: string | null
}

export type SecurityPageState = {
  searchParams: SearchParams
  page: PaginatedSecurityRead | null
  hoveredSecurityId: number | null
}

export const emptySearchParams: SearchParams = {
  search: null
} as const;

const initialState: SecurityPageState = {
  page: null,
  searchParams: emptySearchParams,
  hoveredSecurityId: null
} as const;

export type ReadableSecurityPageStore = ReadableSignalStore<SecurityPageState, Computed, Methods>;

export const securityPageStore = signalStore(
  withState(initialState),
  withComputed((): Computed => {
    return {}
  }),
  withMethods((signalStore: WritableSignalStore<SecurityPageState, Computed>,
               globalStore: Store<AppState> = inject(Store),
               securityApi: SecurityApi = inject(SecurityApi)): Methods => {
    return {
      hoverSecurity: (securityId: number | null) => hoverSecurity(signalStore, securityId),
      initialize: (): void => initialize(signalStore, globalStore, securityApi),
      loadPage: (pageIndex: number) => loadPage(signalStore, globalStore, securityApi, pageIndex),
      search: (searchString?: string) => search(signalStore, globalStore, securityApi, searchString)
    };
  }), withHooks({
    onInit(signalStore: WritableSignalStore<SecurityPageState, Computed, Methods>): void {
      const actions$: Actions = inject(Actions);
      const destroyRef: DestroyRef = inject(DestroyRef);
      actions$.pipe(
        ofType(
          SecurityActions.updateSecuritySuccess,
          SecurityActions.createSecuritySuccess,
          SecurityActions.updateSecurityLogoDone,
          SecurityActions.updateHistoricalSecurityPriceConfigDone
        ),
        takeUntilDestroyed(destroyRef)
      ).subscribe((): void => {
        signalStore.loadPage(signalStore.page()?.currentPage ?? 0)
      })
    }
  })
);
