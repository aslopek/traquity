import {createActionGroup, props} from '@ngrx/store';
import {ErrorNotification} from './notification.state';

export type AddErrorActionArgs = Omit<ErrorNotification, 'id'>;

export type RemoveNotificationActionArgs = Pick<ErrorNotification, 'id'>;

export const NotificationActions = createActionGroup({
  source: 'Notification',
  events: {
    'Add Error': props<AddErrorActionArgs>(),
    'Remove Notification': props<RemoveNotificationActionArgs>()
  }
});
