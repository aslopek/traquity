import {DepotState} from '../../depot.state';
import {SetDividendAggregationTimespanActionArgs} from '../../depot.actions';

export function setDividendAggregationTimespanReducer(state: Readonly<DepotState>, actionArgs: SetDividendAggregationTimespanActionArgs): DepotState {
  if (state.dividend.aggregationTimespan === actionArgs.timespan) {
    return state;
  }

  return {
    ...state,
    dividend: {
      ...state.dividend,
      aggregationTimespan: actionArgs.timespan
    }
  };
}
