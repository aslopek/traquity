import {DepotState} from '../depot.state';
import {DeleteDepotSuccessActionArgs} from '../depot.actions';
import {DepotRead} from '../../../gen/api/depot';

export function deleteDepotReducer(state: Readonly<DepotState>, actionArgs: DeleteDepotSuccessActionArgs): DepotState {
  const {depotId} = actionArgs;
  if (depotId === undefined) {
    return state;
  }

  const depots: DepotRead[] = state.depots.filter(depot => depot.id !== depotId);
  const selectedDepotIds: number[] = state.selectedDepotIds.filter(depotId => depotId !== depotId);

  // deleted the last depot
  if (depots.length === 0) {
    return {
      ...state,
      depots: [],
      selectedDepotIds: []
    }
  }

  // there are depots, but the last selected depot has been deleted
  if (selectedDepotIds.length === 0) {
    return {
      ...state,
      depots,
      selectedDepotCurrency: depots[0].currency,
      selectedDepotIds: [
        depots[0].id
      ]
    };
  }

  // there are still depots and there are still depots selected after the delete operation
  return {
    ...state,
    depots,
    selectedDepotIds
  };
}
