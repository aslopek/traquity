import {createReducer, on} from '@ngrx/store';
import {NotificationActions} from './notification.actions';
import {NotificationState} from './notification.state';
import {addError} from './reducers/add-error.reducer';
import {removeNotification} from './reducers/remove-notification.reducer';

export const initialState: NotificationState = {
  notifications: []
};

export const notificationReducer = createReducer(
  initialState,

  on(NotificationActions.addError, addError),

  on(NotificationActions.removeNotification, removeNotification)
);
