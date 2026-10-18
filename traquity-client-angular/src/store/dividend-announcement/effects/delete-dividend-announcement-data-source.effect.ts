import {Actions, ofType} from '@ngrx/effects';
import {DividendAnnouncementDataSourceApi} from '../../../gen/api/notification/dividend-announcement';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DeleteDividendAnnouncementDataSourceActionArgs, DividendAnnouncementActions} from '../dividend-announcement.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';
import {getDividendAnnouncementDataSource} from '../dividend-announcement.selector';

export type DeleteDividendAnnouncementDataSourceEffectArgs = {
  actions$: Actions
  api: DividendAnnouncementDataSourceApi
  store: Store<AppState>
};

export function deleteDividendAnnouncementDataSource(effectArgs: DeleteDividendAnnouncementDataSourceEffectArgs): Observable<Action> {
  const {actions$, api, store} = effectArgs;
  return actions$.pipe(
    ofType(DividendAnnouncementActions.deleteDividendAnnouncementDataSource),
    concatLatestFrom((actionArgs: DeleteDividendAnnouncementDataSourceActionArgs): Observable<DataSourceWithId | null> => {
      return store.select(getDividendAnnouncementDataSource(actionArgs.id));
    }),
    switchMap(([, dataSource]: [DeleteDividendAnnouncementDataSourceActionArgs, DataSourceWithId | null]): Observable<Action> => {
      if (dataSource === null) {
        return of(DividendAnnouncementActions.deleteDividendAnnouncementDataSourceDone({}));
      }
      return api.deleteDividendAnnouncementDataSource(dataSource.id).pipe(
        map((): Action => DividendAnnouncementActions.deleteDividendAnnouncementDataSourceDone({id: dataSource.id})),
        catchError((): Observable<Action> => of(DividendAnnouncementActions.deleteDividendAnnouncementDataSourceDone({})))
      );
    })
  );
}
