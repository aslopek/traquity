import {inject, Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, concatMap, delay, EMPTY, map, of} from 'rxjs';
import {
  DividendAnnouncementApi,
  DividendAnnouncementDataSourceApi,
  DividendAnnouncementRead
} from '../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementActions} from './dividend-announcement.actions';
import {Store} from '@ngrx/store';
import {AppState} from '../app.state';
import {AppActions} from '../app.actions';
import {
  setDividendAnnouncementDataSource,
  SetDividendAnnouncementDataSourceEffectArgs
} from './effects/set-dividend-announcement-data-source.effect';
import {
  deleteDividendAnnouncementDataSource,
  DeleteDividendAnnouncementDataSourceEffectArgs
} from './effects/delete-dividend-announcement-data-source.effect';

/** Interval between two dividend announcement requests in milliseconds. */
const dividendAnnouncementReloadInterval: number = 10000;

@Injectable()
export class DividendAnnouncementEffects {

  private readonly store: Store<AppState> = inject(Store);
  private readonly actions$: Actions = inject(Actions);
  private readonly dividendAnnouncementApi: DividendAnnouncementApi = inject(DividendAnnouncementApi);
  private readonly dividendAnnouncementDataSourceApi: DividendAnnouncementDataSourceApi
    = inject(DividendAnnouncementDataSourceApi);

  readonly loadDividendAnnouncements = createEffect(() =>
    this.actions$.pipe(
      ofType(DividendAnnouncementActions.loadDividendAnnouncements),
      concatMap(() =>
        this.dividendAnnouncementApi.getDividendAnnouncements().pipe(
          map((dividendAnnouncements: DividendAnnouncementRead[]) =>
            DividendAnnouncementActions.loadDividendAnnouncementsSuccess({dividendAnnouncements})),
          catchError(() => of(DividendAnnouncementActions.loadDividendAnnouncementsError())))
      )
    )
  );

  readonly reloadDividendAnnouncements = createEffect(() =>
    this.actions$.pipe(
      ofType(
        DividendAnnouncementActions.loadDividendAnnouncementsSuccess,
        DividendAnnouncementActions.loadDividendAnnouncementsError
      ),
      concatMap(() => of(DividendAnnouncementActions.loadDividendAnnouncements())
        .pipe(delay(dividendAnnouncementReloadInterval)))
    )
  );

  readonly loadDividendAnnouncementDataSources = createEffect(() =>
    this.actions$.pipe(
      ofType(
        DividendAnnouncementActions.loadDividendAnnouncementDataSources,
        AppActions.initialize
      ),
      concatMap(() => {
        return this.dividendAnnouncementDataSourceApi.getDividendAnnouncementDataSources().pipe(
          map((dataSources) => DividendAnnouncementActions.loadDividendAnnouncementDataSourcesSuccess({dataSources})),
          catchError(() => EMPTY)
        );
      })
    )
  );

  readonly setDividendAnnouncementDataSource = createEffect(() => setDividendAnnouncementDataSource({
    actions$: this.actions$,
    api: this.dividendAnnouncementDataSourceApi,
    store: this.store
  } satisfies SetDividendAnnouncementDataSourceEffectArgs));

  readonly deleteDividendAnnouncementDataSource = createEffect(() => deleteDividendAnnouncementDataSource({
    actions$: this.actions$,
    api: this.dividendAnnouncementDataSourceApi,
    store: this.store
  } satisfies DeleteDividendAnnouncementDataSourceEffectArgs));

  readonly markAsRead = createEffect(() =>
    this.actions$.pipe(
      ofType(DividendAnnouncementActions.markAsRead),
      concatMap(({id}) =>
        this.dividendAnnouncementApi.updateDividendAnnouncement(id, {isNew: false}).pipe(
          map(() => DividendAnnouncementActions.markAsReadSuccess({id})),
          catchError(() => EMPTY)
        )
      )
    )
  );
}
