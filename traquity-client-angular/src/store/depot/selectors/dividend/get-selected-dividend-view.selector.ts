import {DepotState, DividendView} from '../../depot.state';

export type GetSelectedDividendViewState = {
  dividend: Pick<DepotState['dividend'], 'selectedView'>
};

export function getSelectedDividendView(state: GetSelectedDividendViewState): DividendView {
  return state.dividend.selectedView;
}
