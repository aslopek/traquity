import {DepotState} from '../../depot.state';
import {PositionGroupBy} from '../../position-grouping/position-group.type';

export type GetPositionGroupByState = {
  position: Pick<DepotState['position'], 'groupBy'>
};

export function getPositionGroupBy(state: GetPositionGroupByState): PositionGroupBy {
  return state.position.groupBy;
}
