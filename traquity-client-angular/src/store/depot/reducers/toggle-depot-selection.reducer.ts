import {DepotState} from '../depot.state';
import {ToggleDepotSelectionActionArgs} from '../depot.actions';
import {DepotRead} from '../../../gen/api/depot';
import {multipleSelectionAllowed} from '../selectors/multiple-selection-allowed.selector';

export function toggleDepotSelectionReducer(state: Readonly<DepotState>, actionArgs: ToggleDepotSelectionActionArgs): DepotState {
  const depot: DepotRead | undefined = state.depots.find((item: DepotRead) => item.id === actionArgs.depotId)
  if (depot === undefined) {
    return state;
  }

  if (state.selectedDepotIds.includes(depot.id)) {
    return unselectDepot(state, depot.id);
  }
  return selectDepot(state, depot);
}

function selectDepot(state: Readonly<DepotState>, depot: DepotRead): DepotState {
  if (depot.currency !== state.selectedDepotCurrency || !multipleSelectionAllowed(state)) {
    return {
      ...state,
      selectedDepotCurrency: depot.currency,
      selectedDepotIds: [depot.id]
    }
  }

  return {
    ...state,
    selectedDepotIds: [
      ...state.selectedDepotIds,
      depot.id
    ]
  };
}

function unselectDepot(state: Readonly<DepotState>, depotId: number): DepotState {
  const newState: DepotState = {
    ...state,
    selectedDepotIds: state.selectedDepotIds.filter(id => id !== depotId)
  };

  if (newState.selectedDepotIds.length === 0) {
    return state;
  }
  return newState;
}

