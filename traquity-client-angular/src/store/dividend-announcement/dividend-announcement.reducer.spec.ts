import {beforeEach, describe, expect, it} from '@jest/globals';
import {DividendAnnouncementRead} from '../../gen/api/notification/dividend-announcement';
import {dividendAnnouncementReadFactory} from '../../testing/dividend-announcement-read.factory';
import {DividendAnnouncementActions} from './dividend-announcement.actions';
import {dividendAnnouncementReducer} from './dividend-announcement.reducer';
import {DividendAnnouncementState} from './dividend-announcement.state';

describe('dividendAnnouncementReducer', (): void => {
  let state: DividendAnnouncementState;

  beforeEach((): void => {
    state = {
      dividendAnnouncements: [dividendAnnouncementReadFactory({id: 1, securityId: 1, payDate: '2026-01-01'})],
      dataSources: {},
    };
  });

  describe('loadDividendAnnouncementsSuccess', (): void => {
    it('replaces the announcements with a same-length list whose content differs', (): void => {
      const reloaded: DividendAnnouncementRead[] = [
        dividendAnnouncementReadFactory({id: 2, securityId: 2, payDate: '2026-02-01'}),
      ];

      const result: DividendAnnouncementState = dividendAnnouncementReducer(state,
        DividendAnnouncementActions.loadDividendAnnouncementsSuccess({dividendAnnouncements: reloaded}));

      expect(result.dividendAnnouncements).toEqual(reloaded);
    });
  });
});
