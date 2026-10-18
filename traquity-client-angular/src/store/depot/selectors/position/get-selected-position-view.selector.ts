import {DepotState, PositionView} from '../../depot.state';

export type GetSelectedPositionViewState = {
  position: Pick<DepotState['position'], 'selectedView'>
};

export function getSelectedPositionView(state: GetSelectedPositionViewState): PositionView {
  return state.position.selectedView;
}
