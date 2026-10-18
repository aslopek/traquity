import {DepotState} from './depot.state';
import {createReducer, on} from '@ngrx/store';
import {DepotActions} from './depot.actions';
import {setDepotSliceReducer} from './reducers/set-depot-slice.reducer';
import {
  dividendAggregationTimespan,
  dividendIncludeSpecialDividends,
  dividendSelectedView,
  dividendUseGrossValues,
  positionGroupBy,
  positionSelectedView,
  positionUseBuyIn,
  selectedDepotIds,
  selectedTabIndex
} from './depot-config-keys';
import {addDepotReducer} from './reducers/add-depot.reducer';
import {deleteDepotReducer} from './reducers/delete-depot.reducer';
import {selectDepotTabReducer} from './reducers/select-depot-tab.reducer';
import {toggleDepotSelectionReducer} from './reducers/toggle-depot-selection.reducer';
import {setPerformanceDataReducer} from './reducers/set-performance-data.reducer';
import {setIncludeSpecialDividendsReducer} from './reducers/dividend/set-include-special-dividends.reducer';
import {setUseDividendGrossValuesReducer} from './reducers/dividend/set-use-dividend-gross-values.reducer';
import {setDividendAggregationTimespanReducer} from './reducers/dividend/set-dividend-aggregation-timespan.reducer';
import {setSelectedDividendViewReducer} from './reducers/dividend/set-selected-dividend-view.reducer';
import {setUsePositionBuyInValuesReducer} from './reducers/position/set-use-position-buy-in-values.reducer';
import {setSelectedPositionViewReducer} from './reducers/position/set-selected-position-view.reducer';
import {setPerformanceReducer} from './reducers/performance/set-performance.reducer';
import {setPositionGroupByReducer} from './reducers/position/set-position-group-by.reducer';

export const initialState: DepotState = {
  depots: [],
  selectedDepotCurrency: 'EUR',
  selectedDepotIds: selectedDepotIds.default,
  selectedTabIndex: selectedTabIndex.default,
  dividend: {
    dividends: null,
    aggregationTimespan: dividendAggregationTimespan.default,
    includeSpecialDividends: dividendIncludeSpecialDividends.default,
    selectedView: dividendSelectedView.default,
    useGrossValues: dividendUseGrossValues.default
  },
  position: {
    positions: null,
    selectedView: positionSelectedView.default,
    useBuyIn: positionUseBuyIn.default,
    incomeByPosition: {},
    groupBy: positionGroupBy.default
  },
  performance: {
    performance: null
  }
} as const;

export const depotReducer = createReducer(
  initialState,
  on(DepotActions.addDepotSuccess, addDepotReducer),
  on(DepotActions.deleteDepotSuccess, deleteDepotReducer),
  on(DepotActions.loadDividendsPositionsSuccess, setPerformanceDataReducer),
  on(DepotActions.setDepotsSlice, setDepotSliceReducer),
  on(DepotActions.toggleDepotSelection, toggleDepotSelectionReducer),
  on(DepotActions.selectDepotTab, selectDepotTabReducer),
  // depot.dividend reducers
  on(DepotActions.setDividendAggregationTimespan, setDividendAggregationTimespanReducer),
  on(DepotActions.setIncludeSpecialDividends, setIncludeSpecialDividendsReducer),
  on(DepotActions.setSelectedDividendView, setSelectedDividendViewReducer),
  on(DepotActions.setUseDividendGrossValues, setUseDividendGrossValuesReducer),
  // depot.position reducers
  on(DepotActions.setSelectedPositionView, setSelectedPositionViewReducer),
  on(DepotActions.setUsePositionBuyInValues, setUsePositionBuyInValuesReducer),
  on(DepotActions.setPositionGroupBy, setPositionGroupByReducer),
  // depot/performance reducers
  on(DepotActions.loadPerformanceDone, setPerformanceReducer)
);
