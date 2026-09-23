import {AiState} from './ai/ai.state';
import {AppConfigState} from './app-config/app-config.state';
import {DividendAnnouncementState} from './dividend-announcement/dividend-announcement.state';
import {NotificationState} from './notification/notification.state';
import {SecurityState} from './security/security.state';
import {DepotState} from './depot/depot.state';

export const aiSlice = 'ai';
export const appConfigSlice = 'app-config';
export const depotSlice = 'depot';
export const dividendAnnouncementSlice = 'dividend-announcement';
export const notificationSlice = 'notification';
export const securitySlice = 'security';

export type AppState = {
  [aiSlice]: AiState,
  [appConfigSlice]: AppConfigState,
  [depotSlice]: DepotState,
  [dividendAnnouncementSlice]: DividendAnnouncementState
  [notificationSlice]: NotificationState
  [securitySlice]: SecurityState
};
