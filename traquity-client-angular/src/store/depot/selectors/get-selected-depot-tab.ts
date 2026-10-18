import {DepotState} from '../depot.state';
import {DepotTab, tabIndexDividends, tabIndexPerformance, tabIndexPositions, tabIndexTransactions} from '../depot-tabs';

export type GetSelectedTabState = Pick<DepotState, 'selectedTabIndex'>;

export function getSelectedDepotTab(state: GetSelectedTabState): DepotTab {
  const index: number = state.selectedTabIndex;

  switch (index) {
    case tabIndexPositions:
      return {
        tab: 'positions',
        index: tabIndexPositions
      };
    case tabIndexDividends:
      return {
        tab: 'dividends',
        index: tabIndexDividends
      };
    case tabIndexPerformance:
      return {
        tab: 'performance',
        index: tabIndexPerformance
      }
    case tabIndexTransactions:
      return {
        tab: 'transactions',
        index: tabIndexTransactions
      };
    default:
      return {
        tab: 'transactions',
        index: tabIndexTransactions
      };
  }
}
