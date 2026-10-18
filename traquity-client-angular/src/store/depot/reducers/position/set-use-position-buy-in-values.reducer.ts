import {DepotState} from '../../depot.state';
import {SetUsePositionBuyInValuesActionArgs} from '../../depot.actions';

export function setUsePositionBuyInValuesReducer(state: Readonly<DepotState>, actionArgs: SetUsePositionBuyInValuesActionArgs): DepotState {
  if (state.position.useBuyIn === actionArgs.useBuyInValues) {
    return state;
  }

  return {
    ...state,
    position: {
      ...state.position,
      useBuyIn: actionArgs.useBuyInValues
    }
  };
}
