import {DepotState, IncomeByPosition} from '../../depot.state';

export type GetIncomeByPositionState = {
  position: Pick<DepotState['position'], 'incomeByPosition'>
};

export function getIncomeByPosition(state: GetIncomeByPositionState): IncomeByPosition {
  return state.position.incomeByPosition;
}
