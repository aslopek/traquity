import {SecurityState} from '../security.state';
import {DeleteHistoricalSecurityPriceDataSourceDoneActionArgs} from '../security.actions';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';

export function deleteHistoricalSecurityPriceDataSource(state: Readonly<SecurityState>, args: DeleteHistoricalSecurityPriceDataSourceDoneActionArgs): SecurityState {
  const id: number | undefined = args.id;
  if (id === undefined) {
    return state;
  }

  const i: number = state.historicalSecurityPriceDataSources.findIndex((dataSource: DataSourceWithId): boolean => dataSource.id === id);
  return {
    ...state,
    historicalSecurityPriceDataSources: [
      ...state.historicalSecurityPriceDataSources.slice(0, i),
      ...state.historicalSecurityPriceDataSources.slice(i + 1)
    ]
  };
}