import {createFeatureSelector, createSelector, MemoizedSelector} from '@ngrx/store';
import {AppState, depotSlice} from '../app.state';
import {DepotState, DividendView, IncomeByPosition, Positions, PositionView} from './depot.state';
import {getSelectedDepotIds} from './selectors/get-selected-depot-ids';
import {multipleSelectionAllowed} from "./selectors/multiple-selection-allowed.selector";
import {getSelectedDepotTab} from "./selectors/get-selected-depot-tab";
import {DepotRead} from "../../gen/api/depot";
import {getDepots} from "./selectors/get-depots.selector";
import {DepotTab} from "./depot-tabs";
import {getSelectableDepotTabs, SelectableDepotTabs} from "./selectors/get-selectable-depot-tabs.selector";
import {getSelectedDepotCurrency} from "./selectors/get-selected-depot-currency.selector";
import {DepotsByCurrency, getAllDepotsByCurrency} from "./selectors/get-all-depots-by-currency.selector";
import {getSelectedDepots} from "./selectors/get-selected-depots.selector";
import {getIncludeSpecialDividends} from "./selectors/dividend/get-include-special-dividends.selector";
import {Dividends} from "../../gen/api/depot-dividend";
import {getDividends} from "./selectors/dividend/get-dividends.selector";
import {Timespan} from "../../common/types/timespan";
import {getDividendAggregationTimespan} from "./selectors/dividend/get-dividend-aggregation-timespan.selector";
import {getUseDividendGrossValues} from "./selectors/dividend/get-use-dividend-gross-values.selector";
import {getSelectedDividendView} from "./selectors/dividend/get-selected-dividend-view.selector";
import {getUseBuyIn} from "./selectors/position/get-use-buy-in.selector";
import {getSelectedPositionView} from "./selectors/position/get-selected-position-view.selector";
import {getPositions} from "./selectors/position/get-positions.selector";
import {getIncomeByPosition} from "./selectors/position/get-income-by-position.selector";
import {DepotPerformance} from "../../gen/api/depot-performance";
import {getDepotPerformance} from "./selectors/performance/get-depot-performance.selector";
import {getPositionGroupBy} from "./selectors/position/get-position-group-by.selector";
import {GroupedPositions, PositionGroupBy} from "./position-grouping/position-group.type";
import {getGroupedPositions} from "./selectors/position/get-grouped-positions.selector";
import {securitiesById} from "../security/security.selector";

const depotSelector: MemoizedSelector<AppState, DepotState>
  = createFeatureSelector<DepotState>(depotSlice);

export const isMultipleSelectionAllowed: MemoizedSelector<AppState, boolean>
  = createSelector(depotSelector, multipleSelectionAllowed);

export const depots: MemoizedSelector<AppState, DepotRead[]>
  = createSelector(depotSelector, getDepots);

export const depotsByCurrency: MemoizedSelector<AppState, DepotsByCurrency>
  = createSelector(depotSelector, getAllDepotsByCurrency);

export const selectedDepotCurrency: MemoizedSelector<AppState, string>
  = createSelector(depotSelector, getSelectedDepotCurrency);

export const selectedDepots: MemoizedSelector<AppState, DepotRead[]>
  = createSelector(depotSelector, getSelectedDepots);

export const selectedDepotIds: MemoizedSelector<AppState, number[]>
  = createSelector(depotSelector, getSelectedDepotIds);

export const selectableTabs: MemoizedSelector<AppState, SelectableDepotTabs>
  = createSelector(depotSelector, getSelectableDepotTabs);

export const selectedTab: MemoizedSelector<AppState, DepotTab>
  = createSelector(depotSelector, getSelectedDepotTab);

export type SelectedTabAndDepotIds = { selectedDepotIds: number[], selectedTab: DepotTab };
export const selectedTabAndDepotIds: MemoizedSelector<AppState, SelectedTabAndDepotIds>
  = createSelector(selectedTab, selectedDepotIds, (selectedTab: DepotTab, selectedDepotIds: number[]): SelectedTabAndDepotIds => {
  return {selectedTab, selectedDepotIds}
});

// state.dividend selectors

export const dividends: MemoizedSelector<AppState, Dividends | null>
  = createSelector(depotSelector, getDividends);

export const dividendAggregationTimespan: MemoizedSelector<AppState, Timespan>
  = createSelector(depotSelector, getDividendAggregationTimespan);

export const includeSpecialDividends: MemoizedSelector<AppState, boolean>
  = createSelector(depotSelector, getIncludeSpecialDividends);

export const selectedDividendView: MemoizedSelector<AppState, DividendView>
  = createSelector(depotSelector, getSelectedDividendView);

export const useDividendGrossValues: MemoizedSelector<AppState, boolean>
  = createSelector(depotSelector, getUseDividendGrossValues);

// state.position selectors

export const positions: MemoizedSelector<AppState, Positions>
  = createSelector(depotSelector, getPositions);

export const incomeByPosition: MemoizedSelector<AppState, IncomeByPosition>
  = createSelector(depotSelector, getIncomeByPosition);

export const usePositionBuyInValues: MemoizedSelector<AppState, boolean>
  = createSelector(depotSelector, getUseBuyIn);

export const selectedPositionView: MemoizedSelector<AppState, PositionView>
  = createSelector(depotSelector, getSelectedPositionView);

export const positionGroupBy: MemoizedSelector<AppState, PositionGroupBy>
  = createSelector(depotSelector, getPositionGroupBy);

export const groupedPositions: MemoizedSelector<AppState, GroupedPositions>
  = createSelector(positions, securitiesById, positionGroupBy, usePositionBuyInValues, getGroupedPositions);

// state.performance selectors

export const depotPerformance: MemoizedSelector<AppState, DepotPerformance | null>
  = createSelector(depotSelector, getDepotPerformance);
