import {DepotState} from '../../depot.state';
import {SetSelectedDividendViewActionArgs} from '../../depot.actions';

export function setSelectedDividendViewReducer(state: Readonly<DepotState>, actionArgs: SetSelectedDividendViewActionArgs): DepotState {
  if (state.dividend.selectedView === actionArgs.selectedView) {
    return state;
  }

  return {
    ...state,
    dividend: {
      ...state.dividend,
      selectedView: actionArgs.selectedView
    }
  };
}
