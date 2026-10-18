import {DepotState} from '../../depot.state';
import {DepotPerformance} from '../../../../gen/api/depot-performance';

export type GetDepotPerformanceState = {
  performance: Pick<DepotState['performance'], 'performance'>
};

export function getDepotPerformance(state: GetDepotPerformanceState): DepotPerformance | null {
  return state.performance.performance;
}
