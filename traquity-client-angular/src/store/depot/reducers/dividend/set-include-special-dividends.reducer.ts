import {DepotState} from '../../depot.state';
import {SetIncludeSpecialDividendsActionArgs} from '../../depot.actions';

export function setIncludeSpecialDividendsReducer(state: Readonly<DepotState>, actionArgs: SetIncludeSpecialDividendsActionArgs): DepotState {
  if (state.dividend.includeSpecialDividends === actionArgs.includeSpecialDividends) {
    return state;
  }

  return {
    ...state,
    dividend: {
      ...state.dividend,
      includeSpecialDividends: actionArgs.includeSpecialDividends
    }
  };
}
