import {DepotValue} from '../../../../gen/api/depot-performance';

export type RebasedDepotValue = Omit<DepotValue, 'performanceRelative'> & {
  performanceRelative: number | 'infinity'
};
