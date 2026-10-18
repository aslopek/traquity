import {SecurityState} from '../security.state';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';

export type GetHistoricalSecurityPriceDataSourceState = Pick<SecurityState, 'historicalSecurityPriceDataSources'>;

export function getHistoricalSecurityPriceDataSourceSelector(state: Readonly<GetHistoricalSecurityPriceDataSourceState>, id: number): DataSourceWithId | null {
  const i: number = state.historicalSecurityPriceDataSources.findIndex((dataSource: DataSourceWithId): boolean => dataSource.id === id);
  if (i < 0) {
    return null;
  }
  return state.historicalSecurityPriceDataSources[i];
}
