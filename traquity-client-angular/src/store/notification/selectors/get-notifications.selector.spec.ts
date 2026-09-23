import {beforeEach, describe, expect, it} from '@jest/globals';
import {initialState} from '../notification.reducer';
import {Notification} from '../notification.state';
import {GetNotificationsState, getNotificationsSelector} from './get-notifications.selector';

describe('getNotificationsSelector', (): void => {
  let state: Readonly<GetNotificationsState>;
  let notifications: Notification[];

  beforeEach((): void => {
    notifications = [];
    state = {
      ...initialState,
      notifications
    };
  });

  it('returns the notifications', (): void => {
    expect(getNotificationsSelector(state)).toBe(notifications);
  });
});
