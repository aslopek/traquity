import {DepotState} from '../../depot.state';

export type GetUseBuyInState = {
  position: Pick<DepotState['position'], 'useBuyIn'>
};

export function getUseBuyIn(state: GetUseBuyInState): boolean {
  return state.position.useBuyIn;
}
