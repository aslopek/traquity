import {RemoveNotificationActionArgs} from '../notification.actions';
import {Notification, NotificationState} from '../notification.state';

export function removeNotification(state: Readonly<NotificationState>, args: RemoveNotificationActionArgs): NotificationState {
  return {
    ...state,
    notifications: state.notifications.filter((notification: Notification): boolean => notification.id !== args.id)
  };
}
