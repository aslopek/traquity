import {DepotState} from '../depot.state';
import {DepotRead} from '../../../gen/api/depot';

export type GetDepotsState = Pick<DepotState, 'depots'>;

export function getDepots(state: GetDepotsState): DepotRead[] {
  return state.depots;
}
