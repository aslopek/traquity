import {DividendAnnouncementState} from '../dividend-announcement.state';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';

export type GetDividendAnnouncementDataSourcesState = Pick<DividendAnnouncementState, 'dataSources'>;

export function getDividendAnnouncementDataSourcesSelector(state: Readonly<GetDividendAnnouncementDataSourcesState>): DataSourceWithId[] {
  return Object.values(state.dataSources);
}
