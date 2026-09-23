import {DepotState} from "../../depot.state";
import {Timespan} from "../../../../common/types/timespan";

export type GetDividendAggregationTimespanState = {
  dividend: Pick<DepotState['dividend'], 'aggregationTimespan'>
};

export function getDividendAggregationTimespan(state: GetDividendAggregationTimespanState): Timespan {
  return state.dividend.aggregationTimespan;
}
