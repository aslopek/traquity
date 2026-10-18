import {SecurityState} from '../security.state';
import {LoadHistoricalSecurityPriceDataSourcesDoneActionArgs} from '../security.actions';

export function overwriteHistoricalSecurityPriceDataSources(state: Readonly<SecurityState>, args: LoadHistoricalSecurityPriceDataSourcesDoneActionArgs): SecurityState {
  return {
    ...state,
    historicalSecurityPriceDataSources: args.dataSources
  };
}