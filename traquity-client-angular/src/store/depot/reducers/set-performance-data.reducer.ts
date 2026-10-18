import {DepotState, IncomeByPosition} from '../depot.state';
import {LoadDividendsPositionsSuccessActionArgs} from '../depot.actions';

export function setPerformanceDataReducer(state: Readonly<DepotState>, actionArgs: LoadDividendsPositionsSuccessActionArgs): DepotState {
  const incomeByPosition: IncomeByPosition = {};
  if (actionArgs.income != null) {
    for (const income of actionArgs.income) {
      for (const id of income.securityIds) {
        incomeByPosition[id] = income;
      }
    }
  }

  return {
    ...state,
    dividend: {
      ...state.dividend,
      dividends: actionArgs.dividends ?? state.dividend.dividends
    },
    position: {
      ...state.position,
      positions: actionArgs.positions ?? state.position.positions,
      incomeByPosition
    }
  };
}
