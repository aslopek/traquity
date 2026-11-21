import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, concatMap, map, Observable, of} from 'rxjs';
import {DividendAnnouncementApi, DividendAnnouncementRead} from '../../../gen/api/notification/dividend-announcement';
import {AppActions} from '../../app.actions';
import {DividendAnnouncementActions} from '../dividend-announcement.actions';

export type LoadDividendAnnouncementsEffectArgs = {
  actions$: Actions
  api: Pick<DividendAnnouncementApi, 'getDividendAnnouncements'>
};

export function loadDividendAnnouncements(effectArgs: LoadDividendAnnouncementsEffectArgs): Observable<Action> {
  const {actions$, api} = effectArgs;
  return actions$.pipe(
    ofType(
      AppActions.initialize,
      DividendAnnouncementActions.loadDividendAnnouncements
    ),
    concatMap((): Observable<Action> => api.getDividendAnnouncements().pipe(
      map((dividendAnnouncements: DividendAnnouncementRead[]): Action =>
        DividendAnnouncementActions.loadDividendAnnouncementsSuccess({dividendAnnouncements})),
      catchError((): Observable<Action> => of(DividendAnnouncementActions.loadDividendAnnouncementsError()))
    ))
  );
}
