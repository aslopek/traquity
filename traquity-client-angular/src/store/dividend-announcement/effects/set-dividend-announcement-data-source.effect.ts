import {Actions, ofType} from '@ngrx/effects';
import {
  DividendAnnouncementDataSourceApi,
  DividendAnnouncementDataSourceCreate,
  DividendAnnouncementDataSourceRead,
  DividendAnnouncementDataSourceUpdate
} from '../../../gen/api/notification/dividend-announcement';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DividendAnnouncementActions, SetDividendAnnouncementDataSourceActionArgs} from '../dividend-announcement.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';
import {getDividendAnnouncementDataSource} from '../dividend-announcement.selector';

export type SetDividendAnnouncementDataSourceEffectArgs = {
  actions$: Actions
  api: DividendAnnouncementDataSourceApi
  store: Store<AppState>
};

export function setDividendAnnouncementDataSource(effectArgs: SetDividendAnnouncementDataSourceEffectArgs): Observable<Action> {
  const {actions$, api, store} = effectArgs;
  return actions$.pipe(
    ofType(DividendAnnouncementActions.setDividendAnnouncementDataSource),
    concatLatestFrom((actionArgs: SetDividendAnnouncementDataSourceActionArgs): Observable<DataSourceWithId | null> => {
      if (actionArgs.id === undefined) {
        return of(null);
      }
      return store.select(getDividendAnnouncementDataSource(actionArgs.id));
    }),
    switchMap(([actionArgs, dataSource]: [SetDividendAnnouncementDataSourceActionArgs, DataSourceWithId | null]): Observable<Action> => {
      if (dataSource == null) {
        const dataSourceCreate: DividendAnnouncementDataSourceCreate = {
          ...actionArgs.dataSource
        };
        return api.createDividendAnnouncementDataSource(dataSourceCreate).pipe(
          map((response: DividendAnnouncementDataSourceRead): Action => {
            return DividendAnnouncementActions.setDividendAnnouncementDataSourceDone({dataSource: response});
          }),
          catchError((): Observable<Action> => of(DividendAnnouncementActions.setDividendAnnouncementDataSourceDone({})))
        );
      }

      const dataSourceUpdate: DividendAnnouncementDataSourceUpdate = {
        ...actionArgs.dataSource,
        version: dataSource.version
      };
      return api.updateDividendAnnouncementDataSource(dataSource.id, dataSourceUpdate).pipe(
        map((response: DividendAnnouncementDataSourceRead): Action => {
          return DividendAnnouncementActions.setDividendAnnouncementDataSourceDone({dataSource: response});
        }),
        catchError((): Observable<Action> => of(DividendAnnouncementActions.setDividendAnnouncementDataSourceDone({})))
      );
    })
  );
}
