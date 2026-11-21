import {beforeEach, describe, expect, it} from '@jest/globals';
import {Observable, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {DividendAnnouncementActions} from '../../dividend-announcement/dividend-announcement.actions';
import {dividendAnnouncementReadFactory} from '../../../testing/dividend-announcement-read.factory';
import {SecurityActions} from '../security.actions';
import {loadSecuritiesOn} from './load-securities-on.effect';

describe('loadSecuritiesOn', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({hot, expectObservable}: RunHelpers): void => {
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = loadSecuritiesOn({actions$});
      expectObservable(effect$.pipe(tap((action: Action): number => emitted.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return emitted;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';

    // marble alphabet of the action stream: `a` references the securities 1 and 2, `b` the securities 2 and 3
    actionValues = {
      a: DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 1, securityId: 1}),
          dividendAnnouncementReadFactory({id: 2, securityId: 2}),
          dividendAnnouncementReadFactory({id: 3, securityId: 1})
        ]
      }),
      b: DividendAnnouncementActions.loadDividendAnnouncementsSuccess({
        dividendAnnouncements: [
          dividendAnnouncementReadFactory({id: 4, securityId: 2}),
          dividendAnnouncementReadFactory({id: 5, securityId: 3})
        ]
      })
    };
  });

  it('loads every referenced security of a trigger once', (): void => {
    const emitted: Action[] = expectEffect('-(lm)', {
      l: SecurityActions.loadSecurity({securityId: 1}),
      m: SecurityActions.loadSecurity({securityId: 2})
    });
    expect(emitted).toEqual([
      SecurityActions.loadSecurity({securityId: 1}),
      SecurityActions.loadSecurity({securityId: 2})
    ]);
  });

  it('loads the referenced securities of every further trigger', (): void => {
    actionMarbles = '-a----b';

    const emitted: Action[] = expectEffect('-(lm)-(mn)', {
      l: SecurityActions.loadSecurity({securityId: 1}),
      m: SecurityActions.loadSecurity({securityId: 2}),
      n: SecurityActions.loadSecurity({securityId: 3})
    });
    expect(emitted).toEqual([
      SecurityActions.loadSecurity({securityId: 1}),
      SecurityActions.loadSecurity({securityId: 2}),
      SecurityActions.loadSecurity({securityId: 2}),
      SecurityActions.loadSecurity({securityId: 3})
    ]);
  });
});
