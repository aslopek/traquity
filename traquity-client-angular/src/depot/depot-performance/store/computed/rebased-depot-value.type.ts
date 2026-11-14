import {DepotValue} from '../../../../gen/api/depot-performance';
import {RelativePerformance} from '../../../../common/types/relative-performance';

export type RebasedDepotValue = Omit<DepotValue, 'performanceRelative'> & {
  performanceRelative: RelativePerformance
};
