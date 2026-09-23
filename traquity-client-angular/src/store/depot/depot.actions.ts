import {createActionGroup, emptyProps, props} from '@ngrx/store';
import {DepotState, DividendView, PositionView} from "./depot.state";
import {DepotCreate, DepotRead} from "../../gen/api/depot";
import {DepotTab} from "./depot-tabs";
import {DepotConfigKey} from "./depot-config-keys";
import {Dividends} from "../../gen/api/depot-dividend";
import {DepotComposition} from "../../gen/api/depot-position";
import {Timespan} from "../../common/types/timespan";
import {DepotPerformance, Performance} from "../../gen/api/depot-performance";
import {PositionGroupBy} from "./position-grouping/position-group.type";

export type AddDepotActionArgs = {
  depot: DepotCreate
};

export type AddDepotSuccessActionArgs = {
  depot: DepotRead
};

export type DeleteDepotActionArgs = {
  depotId: number
};

export type DeleteDepotSuccessActionArgs = {
  depotId: number
};

export type DeleteDepotErrorActionArgs = {
  depotId: number
};

export type LoadDividendsPositionsSuccessActionArgs = {
  positions?: DepotComposition | null
  dividends?: Dividends | null
  income?: Performance[] | null
};

export type SetDepotsSliceActionArgs = Omit<DepotState, 'selectedDepotCurrency'>;

export type ToggleDepotSelectionActionArgs = {
  depotId: number
};

export type SelectDepotTabActionArgs = {
  tab: DepotTab
};

export type SyncDepotConfigActionArgs = {
  depotConfigKeys: DepotConfigKey<unknown>[]
};

export type SetIncludeSpecialDividendsActionArgs = {
  includeSpecialDividends: boolean
};

export type SetUseDividendGrossValuesActionArgs = {
  useGrossValues: boolean
};

export type SetDividendAggregationTimespanActionArgs = {
  timespan: Timespan
};

export type SetSelectedDividendViewActionArgs = {
  selectedView: DividendView
};

export type SetSelectedPositionViewActionArgs = {
  selectedView: PositionView
};

export type SetUsePositionBuyInValuesActionArgs = {
  useBuyInValues: boolean
};

export type SetPositionGroupByActionArgs = {
  groupBy: PositionGroupBy
};

export type LoadPerformanceDoneActionArgs = {
  depotPerformance: DepotPerformance | null
};

export const DepotActions = createActionGroup({
  source: 'Depot',
  events: {
    'Add Depot': props<AddDepotActionArgs>(),
    'Add Depot Success': props<AddDepotSuccessActionArgs>(),
    'Add Depot Error': props<AddDepotActionArgs>(),
    'Delete Depot': props<DeleteDepotActionArgs>(),
    'Delete Depot Success': props<DeleteDepotSuccessActionArgs>(),
    'Delete Depot Error': props<DeleteDepotErrorActionArgs>(),
    'Set Depots Slice': props<SetDepotsSliceActionArgs>(),
    'Load Dividends Positions Success': props<LoadDividendsPositionsSuccessActionArgs>(),
    'Toggle DepotSelection': props<ToggleDepotSelectionActionArgs>(),
    'Toggle Depot Selection Done': emptyProps(),
    'Select Depot Tab': props<SelectDepotTabActionArgs>(),
    'Select Depot Tab Done': emptyProps(),
    // reads the specified config keys from the state to update the backend
    'Sync Depot Config': props<SyncDepotConfigActionArgs>(),
    'Sync Depot Config Done': props<SyncDepotConfigActionArgs>(),
    // depot.dividend actions
    'Set Include Special Dividends': props<SetIncludeSpecialDividendsActionArgs>(),
    'Set Include Special Dividends Done': props<SetIncludeSpecialDividendsActionArgs>(),
    'Set Use Dividend Gross Values': props<SetUseDividendGrossValuesActionArgs>(),
    'Set Use Dividend Gross Values Done': props<SetUseDividendGrossValuesActionArgs>(),
    'Set Dividend Aggregation Timespan': props<SetDividendAggregationTimespanActionArgs>(),
    'Set Dividend Aggregation Timespan Done': props<SetDividendAggregationTimespanActionArgs>(),
    'Set Selected Dividend View': props<SetSelectedDividendViewActionArgs>(),
    'Set Selected Dividend View Done': props<SetSelectedDividendViewActionArgs>(),
    // depot.position actions
    'Set Selected Position View': props<SetSelectedPositionViewActionArgs>(),
    'Set Selected Position View Done': props<SetSelectedPositionViewActionArgs>(),
    'Set Use Position Buy In Values': props<SetUsePositionBuyInValuesActionArgs>(),
    'Set Use Position Buy In Values Done': props<SetUsePositionBuyInValuesActionArgs>(),
    'Set Position Group By': props<SetPositionGroupByActionArgs>(),
    'Set Position Group By Done': props<SetPositionGroupByActionArgs>(),
    // depot.performance actions
    'Load Performance Done': props<LoadPerformanceDoneActionArgs>(),
    // an explicit request to reload the depots and everything derived from them, after an operation that can have
    // changed them. Another global-store slice must never dispatch it, per dependency inversion principle: it
    // dispatches its own Done/Success action, which this slice reacts to in a `<verb>-<noun>-on.effect.ts`.
    'Reload Depots': emptyProps()
  }
});

export const ActionsTriggeringPerformanceDataReload = [
  DepotActions.setDepotsSlice,
  DepotActions.addDepotSuccess,
  DepotActions.deleteDepotSuccess,
  DepotActions.toggleDepotSelectionDone,
  DepotActions.reloadDepots
] as const;