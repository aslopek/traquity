import {beforeEach, describe, expect, it} from '@jest/globals';
import {RemoveNotificationActionArgs} from '../notification.actions';
import {initialState} from '../notification.reducer';
import {Notification, NotificationState} from '../notification.state';
import {removeNotification} from './remove-notification.reducer';

describe('removeNotification', (): void => {
  let held: Notification;
  let toBeRemoved: Notification;
  let state: Readonly<NotificationState>;
  let args: RemoveNotificationActionArgs;

  beforeEach((): void => {
    held = {id: 1, message: 'Prices could not be loaded'};
    toBeRemoved = {id: 2, message: 'Exchange rates could not be loaded'};
    state = {
      ...initialState,
      notifications: [held, toBeRemoved]
    };
    args = {id: toBeRemoved.id};
  });

  it('drops the notification carrying the given id', (): void => {
    const result: NotificationState = removeNotification(state, args);

    expect(result.notifications).toEqual([held]);
  });

  it('keeps every notification when no notification carries the given id', (): void => {
    args = {id: toBeRemoved.id + 1};

    const result: NotificationState = removeNotification(state, args);

    expect(result.notifications).toEqual([held, toBeRemoved]);
  });

  it('does not throw an exception when there are no notifications at all', (): void => {
    state = {...initialState};

    const result: NotificationState = removeNotification(state, args);

    expect(result.notifications).toEqual([]);
  });
});
