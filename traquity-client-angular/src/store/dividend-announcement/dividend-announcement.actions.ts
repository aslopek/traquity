import {createActionGroup, emptyProps, props} from '@ngrx/store';
import {DividendAnnouncementDataSourceRead, DividendAnnouncementRead} from '../../gen/api/notification/dividend-announcement';
import {SingleUrlDataSource} from '../../settings/data-source/data-source.type';

export type SetDividendAnnouncementDataSourceActionArgs = {
  dataSource: SingleUrlDataSource
  id?: number
};

export type SetDividendAnnouncementDataSourceDoneActionArgs = {
  dataSource?: DividendAnnouncementDataSourceRead
};

export type DeleteDividendAnnouncementDataSourceActionArgs = {
  id: number
};

export type DeleteDividendAnnouncementDataSourceDoneActionArgs = {
  id?: number
};

export const DividendAnnouncementActions = createActionGroup({
  source: 'DividendAnnouncement',
  events: {
    'Load Dividend Announcements': emptyProps(),
    'Load Dividend Announcements Success': props<{ dividendAnnouncements: DividendAnnouncementRead[] }>(),
    'Load Dividend Announcements Error': emptyProps(),

    'Load Dividend Announcement Data Sources': emptyProps(),
    'Load Dividend Announcement Data Sources Success': props<{ dataSources: DividendAnnouncementDataSourceRead[] }>(),

    'Set Dividend Announcement Data Source': props<SetDividendAnnouncementDataSourceActionArgs>(),
    'Set Dividend Announcement Data Source Done': props<SetDividendAnnouncementDataSourceDoneActionArgs>(),

    'Delete Dividend Announcement Data Source': props<DeleteDividendAnnouncementDataSourceActionArgs>(),
    'Delete Dividend Announcement Data Source Done': props<DeleteDividendAnnouncementDataSourceDoneActionArgs>(),

    'Mark as read': props<{ id: number }>(),
    'Mark as read success': props<{ id: number }>()
  }
});
