import {DividendAnnouncementState} from '../dividend-announcement.state';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';

export type GetDividendAnnouncementDataSourceState = Pick<DividendAnnouncementState, 'dataSources'>;

export function getDividendAnnouncementDataSourceSelector(state: Readonly<GetDividendAnnouncementDataSourceState>, id: number): DataSourceWithId | null {
  return state.dataSources[id] ?? null;
}
