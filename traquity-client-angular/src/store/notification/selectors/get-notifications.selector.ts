import {Notification, NotificationState} from '../notification.state';

export type GetNotificationsState = Pick<NotificationState, 'notifications'>;

export function getNotificationsSelector(state: Readonly<GetNotificationsState>): Notification[] {
  return state.notifications;
}
