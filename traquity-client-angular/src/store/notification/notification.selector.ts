import {createFeatureSelector, createSelector, MemoizedSelector} from '@ngrx/store';
import {AppState, notificationSlice} from '../app.state';
import {Notification, NotificationState} from './notification.state';
import {getNotificationsSelector} from './selectors/get-notifications.selector';

const notificationSelector: MemoizedSelector<AppState, NotificationState>
  = createFeatureSelector<NotificationState>(notificationSlice);

export const notifications: MemoizedSelector<AppState, Notification[]>
  = createSelector(notificationSelector, getNotificationsSelector);
