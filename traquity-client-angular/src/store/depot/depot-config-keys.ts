import {Timespan} from "../../common/types/timespan";
import {DepotState, DividendView, PositionView} from "./depot.state";
import {PositionGroupBy} from "./position-grouping/position-group.type";

export const depotConfigPrefix = 'depot';

export type DepotConfigKey<T> = {
  key: string
  default: T
  getCurrentValue: (state: DepotState) => string
};

export const selectedDepotIds: DepotConfigKey<number[]> = {
  key: `${depotConfigPrefix}.selected-depot-ids`,
  default: [],
  getCurrentValue: (state: DepotState) => JSON.stringify(state.selectedDepotIds)
} as const;

export const selectedTabIndex: DepotConfigKey<number> = {
  key: `${depotConfigPrefix}.selected-tab-index`,
  default: 0,
  getCurrentValue: (state: DepotState) => `${state.selectedTabIndex}`,
} as const;

export const dividendAggregationTimespan: DepotConfigKey<Timespan> = {
  key: `${depotConfigPrefix}.dividend.aggregation-timespan`,
  default: 'month',
  getCurrentValue: (state: DepotState) => state.dividend.aggregationTimespan
} as const;

export const dividendIncludeSpecialDividends: DepotConfigKey<boolean> = {
  key: `${depotConfigPrefix}.dividend.include-special-dividends`,
  default: true,
  getCurrentValue: (state: DepotState) => `${state.dividend.includeSpecialDividends}`
} as const;

export const dividendSelectedView: DepotConfigKey<DividendView> = {
  key: `${depotConfigPrefix}.dividend.selected-view`,
  default: 'barchart',
  getCurrentValue: (state: DepotState) => state.dividend.selectedView
} as const;

export const dividendUseGrossValues: DepotConfigKey<boolean> = {
  key: `${depotConfigPrefix}.dividend.use-gross-values`,
  default: false,
  getCurrentValue: (state: DepotState) => `${state.dividend.useGrossValues}`
} as const;

export const positionSelectedView: DepotConfigKey<PositionView> = {
  key: `${depotConfigPrefix}.position.selected-view`,
  default: 'list',
  getCurrentValue: (state: DepotState) => state.position.selectedView
} as const;

export const positionUseBuyIn: DepotConfigKey<boolean> = {
  key: `${depotConfigPrefix}.position.use-buy-in`,
  default: false,
  getCurrentValue: (state: DepotState) => `${state.position.useBuyIn}`
} as const;

export const positionGroupBy: DepotConfigKey<PositionGroupBy> = {
  key: `${depotConfigPrefix}.position.group-by`,
  default: 'none',
  getCurrentValue: (state: DepotState) => state.position.groupBy
} as const;
