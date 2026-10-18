import {DepotState} from '../../depot.state';
import {SetPositionGroupByActionArgs} from '../../depot.actions';

export function setPositionGroupByReducer(state: Readonly<DepotState>, actionArgs: SetPositionGroupByActionArgs): DepotState {
  if (state.position.groupBy === actionArgs.groupBy) {
    return state;
  }

  return {
    ...state,
    position: {
      ...state.position,
      groupBy: actionArgs.groupBy
    }
  };
}
