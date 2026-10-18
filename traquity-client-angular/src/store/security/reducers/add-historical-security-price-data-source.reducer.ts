import {SecurityState} from '../security.state';
import {SetHistoricalSecurityPriceDataSourceDoneActionArgs} from '../security.actions';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';
import {HistoricalSecurityPriceDataSourceRead} from '../../../gen/api/historical-security-price';

export function setHistoricalSecurityPriceDataSource(state: Readonly<SecurityState>,
                                                     args: SetHistoricalSecurityPriceDataSourceDoneActionArgs): SecurityState {
  const ds: HistoricalSecurityPriceDataSourceRead | undefined = args.dataSource;
  if (ds === undefined) {
    return state;
  }

  const i: number = state.historicalSecurityPriceDataSources.findIndex((dataSource: DataSourceWithId): boolean => dataSource.id === ds.id);
  if (i < 0) {
    return {
      ...state,
      historicalSecurityPriceDataSources: [
        ...state.historicalSecurityPriceDataSources,
        ds
      ]
    };
  }

  return {
    ...state,
    historicalSecurityPriceDataSources: [
      ...state.historicalSecurityPriceDataSources.slice(0, i),
      ds,
      ...state.historicalSecurityPriceDataSources.slice(i + 1)
    ]
  };
}
