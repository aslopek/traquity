import {DepotState} from '../../depot.state';
import {LoadPerformanceDoneActionArgs} from '../../depot.actions';

export function setPerformanceReducer(state: Readonly<DepotState>, actionArgs: LoadPerformanceDoneActionArgs): DepotState {
  return {
    ...state,
    performance: {
      ...state.performance,
      performance: actionArgs.depotPerformance
    }
  };
}
