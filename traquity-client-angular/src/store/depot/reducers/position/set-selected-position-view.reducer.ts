import {DepotState} from '../../depot.state';
import {SetSelectedPositionViewActionArgs} from '../../depot.actions';

export function setSelectedPositionViewReducer(state: Readonly<DepotState>, actionArgs: SetSelectedPositionViewActionArgs): DepotState {
  if (state.position.selectedView === actionArgs.selectedView) {
    return state;
  }

  return {
    ...state,
    position: {
      ...state.position,
      selectedView: actionArgs.selectedView
    }
  };
}
