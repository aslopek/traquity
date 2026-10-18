import {DepotState} from '../depot.state';
import {AddDepotSuccessActionArgs} from '../depot.actions';
import {tabIndexTransactions} from '../depot-tabs';

export function addDepotReducer(state: Readonly<DepotState>, actionArgs: AddDepotSuccessActionArgs): DepotState {
  const {depot} = actionArgs;

  return {
    ...state,
    depots: [
      ...state.depots,
      depot
    ],
    selectedDepotCurrency: depot.currency,
    selectedDepotIds: [
      depot.id
    ],
    selectedTabIndex: tabIndexTransactions
  };
}
