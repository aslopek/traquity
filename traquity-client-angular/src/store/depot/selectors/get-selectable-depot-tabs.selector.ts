import {DepotState} from '../depot.state';

export type GetSelectableDepotTabsStage = Pick<DepotState, 'selectedDepotIds' | 'selectedTabIndex'>;

export type SelectableDepotTabs = {
  positions: boolean
  dividends: boolean
  performance: boolean
  transactions: boolean
};

export function getSelectableDepotTabs(state: GetSelectableDepotTabsStage): SelectableDepotTabs {
  const selectedDepotIds: number[] = state.selectedDepotIds;

  if (selectedDepotIds.length === 0) {
    return {
      positions: false,
      dividends: false,
      performance: false,
      transactions: false
    };
  }

  return {
    positions: true,
    dividends: true,
    performance: true,
    transactions: selectedDepotIds.length === 1
  };
}
