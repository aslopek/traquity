import {SecurityState} from '../security.state';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';

export type GetHistoricalSecurityPriceDataSourcesState = Pick<SecurityState, 'historicalSecurityPriceDataSources'>;

export function getHistoricalSecurityPriceDataSourcesSelector(state: Readonly<GetHistoricalSecurityPriceDataSourcesState>): DataSourceWithId[] {
  return state.historicalSecurityPriceDataSources;
}
