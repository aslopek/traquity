import {DepotState} from '../depot.state';
import {DepotRead} from '../../../gen/api/depot';

export type GetSelectedDepotsState = Pick<DepotState, 'depots' | 'selectedDepotIds'>;

export function getSelectedDepots(state: GetSelectedDepotsState): DepotRead[] {
  const result: DepotRead[] = [];
  for (const depot of state.depots) {
    if (state.selectedDepotIds.includes(depot.id)) {
      result.push(depot);
    }
  }
  return result;
}
