import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Actions} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {Observable, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {DividendAnnouncementRead} from '../../../gen/api/notification/dividend-announcement';
import {dividendAnnouncementReadFactory} from '../../../testing/dividend-announcement-read.factory';
import {AppActions} from '../../app.actions';
import {DividendAnnouncementActions} from '../dividend-announcement.actions';
import {loadDividendAnnouncements, LoadDividendAnnouncementsEffectArgs} from './load-dividend-announcements.effect';

type MockedDividendAnnouncementApi = LoadDividendAnnouncementsEffectArgs['api'];
type GetDividendAnnouncements = () => Observable<DividendAnnouncementRead[]>;

describe('loadDividendAnnouncements', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let responseMarbles: string;
  let dividendAnnouncements: DividendAnnouncementRead[];
  let getDividendAnnouncements: jest.Mock<GetDividendAnnouncements>;
  let effectArgs: Omit<LoadDividendAnnouncementsEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      getDividendAnnouncements.mockImplementation((): Observable<DividendAnnouncementRead[]> =>
        cold(responseMarbles, {r: dividendAnnouncements}));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = loadDividendAnnouncements({actions$, ...effectArgs});
      expectObservable(effect$.pipe(tap((action: Action): number => emitted.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return emitted;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-i';
    responseMarbles = '--(r|)';
    dividendAnnouncements = [
      dividendAnnouncementReadFactory({id: 1, securityId: 1}),
      dividendAnnouncementReadFactory({id: 2, securityId: 2})
    ];

    // marble alphabet of the action stream: `i` initializes the app, `l` requests a load
    actionValues = {
      i: AppActions.initialize(),
      l: DividendAnnouncementActions.loadDividendAnnouncements()
    };

    getDividendAnnouncements = jest.fn<GetDividendAnnouncements>();
    effectArgs = {
      api: {
        getDividendAnnouncements: getDividendAnnouncements as unknown as MockedDividendAnnouncementApi['getDividendAnnouncements']
      } satisfies MockedDividendAnnouncementApi
    };
  });

  it('loads the announcements when the app initializes', (): void => {
    const emitted: Action[] = expectEffect('---s', {
      s: DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2})
        ]
      })
    });
    expect(emitted).toEqual([
      DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2})
        ]
      })
    ]);
    expect(getDividendAnnouncements).toHaveBeenCalledTimes(1);
    expect(getDividendAnnouncements).toHaveBeenCalledWith();
  });

  it('loads the announcements on a request to load them', (): void => {
    actionMarbles = '-l';

    const emitted: Action[] = expectEffect('---s', {
      s: DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2})
        ]
      })
    });
    expect(emitted).toEqual([
      DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2})
        ]
      })
    ]);
    expect(getDividendAnnouncements).toHaveBeenCalledTimes(1);
    expect(getDividendAnnouncements).toHaveBeenCalledWith();
  });

  it('reports a failed load', (): void => {
    responseMarbles = '--#';

    const emitted: Action[] = expectEffect('---e', {e: DividendAnnouncementActions.loadDividendAnnouncementsError()});
    expect(emitted).toEqual([DividendAnnouncementActions.loadDividendAnnouncementsError()]);
  });

  it('starts a request arriving during a load once that load has answered', (): void => {
    actionMarbles = '-il';
    responseMarbles = '---r|';

    const emitted: Action[] = expectEffect('----s---s', {
      s: DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2})
        ]
      })
    });
    expect(emitted).toEqual([
      DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2})
        ]
      }),
      DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2})
        ]
      })
    ]);
    expect(getDividendAnnouncements.mock.calls).toEqual([[], []]);
  });
});
