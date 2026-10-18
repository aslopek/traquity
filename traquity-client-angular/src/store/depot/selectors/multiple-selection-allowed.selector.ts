import {DepotState} from '../depot.state';
import {tabIndexTransactions} from '../depot-tabs';

export type IsMultipleSelectionAllowedState = Pick<DepotState, 'selectedTabIndex'>;

export function multipleSelectionAllowed(state: IsMultipleSelectionAllowedState): boolean {
  return state.selectedTabIndex !== tabIndexTransactions;
}
