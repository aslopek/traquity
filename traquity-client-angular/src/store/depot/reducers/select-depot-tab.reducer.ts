import {DepotState} from '../depot.state';
import {SelectDepotTabActionArgs} from '../depot.actions';
import {tabIndexDividends, tabIndexPerformance, tabIndexPositions, tabIndexTransactions} from '../depot-tabs';

export function selectDepotTabReducer(state: Readonly<DepotState>, actionArgs: SelectDepotTabActionArgs): DepotState {
  const tab = actionArgs.tab.tab;

  if (state.selectedDepotIds.length > 1 && tab === 'transactions') {
    // cannot switch to transactions, when more than one depot is selected
    return state;
  }

  switch (tab) {
    case 'positions':
      return {
        ...state,
        selectedTabIndex: tabIndexPositions
      };
    case 'dividends':
      return {
        ...state,
        selectedTabIndex: tabIndexDividends
      };
    case 'performance':
      return {
        ...state,
        selectedTabIndex: tabIndexPerformance
      }
    case 'transactions':
      return {
        ...state,
        selectedTabIndex: tabIndexTransactions
      }
    default:
      return state;
  }
}