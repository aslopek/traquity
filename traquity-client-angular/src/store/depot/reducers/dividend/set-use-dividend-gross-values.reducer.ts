import {DepotState} from '../../depot.state';
import {SetUseDividendGrossValuesActionArgs} from '../../depot.actions';

export function setUseDividendGrossValuesReducer(state: Readonly<DepotState>, actionArgs: SetUseDividendGrossValuesActionArgs): DepotState {
  if (state.dividend.useGrossValues === actionArgs.useGrossValues) {
    return state;
  }

  return {
    ...state,
    dividend: {
      ...state.dividend,
      useGrossValues: actionArgs.useGrossValues
    }
  };
}
