export type ErrorNotification = {
  id: number
  message: string
};

export type Notification = ErrorNotification;

export type NotificationState = {
  notifications: Notification[]
};
