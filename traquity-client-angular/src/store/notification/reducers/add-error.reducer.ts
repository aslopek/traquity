import {AddErrorActionArgs} from '../notification.actions';
import {Notification, ErrorNotification, NotificationState} from '../notification.state';

export function addError(state: Readonly<NotificationState>, args: AddErrorActionArgs): NotificationState {
  const highestId: number = state.notifications.reduce(
    (highest: number, notification: Notification): number => Math.max(highest, notification.id), 0);

  const error: ErrorNotification = {
    id: highestId + 1,
    message: args.message
  };

  return {
    ...state,
    notifications: [...state.notifications, error]
  };
}
