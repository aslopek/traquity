import {inject, Injectable} from '@angular/core';
import {Actions, createEffect} from '@ngrx/effects';
import {DepotApi} from '../../gen/api/depot';
import {initializeDepotsSlice, InitializeDepotsSliceEffectArgs} from './effects/initialize-depot-slice.effect';
import {ConfigApi} from '../../gen/api/configuration';
import {synchronizeDepotConfig, SynchronizeDepotConfigEffectArgs} from './effects/synchronize-depot-config.effect';
import {Store} from '@ngrx/store';
import {AppState} from '../app.state';
import {deleteDepot, DeleteDepotEffectArgs} from './effects/delete-depot.effect';
import {addDepot, AddDepotEffectArgs} from './effects/add-depot.effect';
import {selectDepotTab, SelectDepotTabEffectArgs} from './effects/select-depot-tab.effect';
import {ChangeDepotSelectionEffectArgs, toggleDepotSelection} from './effects/toggle-depot-selection.effect';
import {addDepotSuccess, AddDepotSuccessEffectArgs} from './effects/add-depot-success.effect';
import {deleteDepotSuccess, DeleteDepotSuccessEffectArgs} from './effects/delete-depot-success.effect';
import {DividendApi} from '../../gen/api/depot-dividend';
import {loadDividendsPositions, LoadDividendsPositionsEffectArgs} from './effects/load-dividends-positions.effect';
import {DepotPositionApi} from '../../gen/api/depot-position';
import {IncludeSpecialDividendsEffectArgs, setIncludeSpecialDividends} from './effects/dividend/set-include-special-dividends.effect';
import {setUseDividendGrossValues, UseDividendGrossValuesEffectArgs} from './effects/dividend/set-use-dividend-gross-values.effect';
import {loadDividends, LoadDividendsEffectArgs} from './effects/dividend/load-dividends.effect';
import {
  DividendAggregationTimespanEffectArgs,
  setDividendAggregationTimespan
} from './effects/dividend/set-dividend-aggregation-timespan.effect';
import {setSelectedDividendView, SetSelectedDividendViewEffectArgs} from './effects/dividend/set-selected-dividend-view.effect';
import {setSelectedPositionView, SetSelectedPositionViewEffectArgs} from './effects/position/set-selected-position-view.effect';
import {setUsePositionBuyInValues, SetUsePositionBuyInValuesEffectArgs} from './effects/position/set-use-position-buy-in-values.effect';
import {setPositionGroupBy, SetPositionGroupByEffectArgs} from './effects/position/set-position-group-by.effect';
import {DepotPerformanceApi, DepotPerformanceIncomeApi} from '../../gen/api/depot-performance';
import {loadPerformance, LoadPerformanceEffectArgs} from './effects/performance/load-performance.effect';
import {reloadDepotsOn, ReloadDepotsOnEffectArgs} from './effects/reload-depots-on.effect';

@Injectable()
export class DepotEffects {

  private readonly actions$: Actions = inject(Actions);
  private readonly configApi: ConfigApi = inject(ConfigApi);
  private readonly depotApi: DepotApi = inject(DepotApi);
  private readonly depotPerformanceApi: DepotPerformanceApi = inject(DepotPerformanceApi);
  private readonly depotPerformanceIncomeApi: DepotPerformanceIncomeApi = inject(DepotPerformanceIncomeApi);
  private readonly depotPositionApi: DepotPositionApi = inject(DepotPositionApi);
  private readonly dividendApi: DividendApi = inject(DividendApi);
  private readonly store: Store<AppState> = inject(Store);

  private addDepot = createEffect(() => addDepot({
    actions$: this.actions$,
    depotApi: this.depotApi
  } satisfies AddDepotEffectArgs));

  readonly addDepotSuccess = createEffect(() => addDepotSuccess({
    actions$: this.actions$
  } satisfies AddDepotSuccessEffectArgs));

  private deleteDepot = createEffect(() => deleteDepot({
    actions$: this.actions$,
    depotApi: this.depotApi,
    store: this.store
  } satisfies DeleteDepotEffectArgs));

  private deleteDepotSuccess = createEffect(() => deleteDepotSuccess({
    actions$: this.actions$
  } satisfies DeleteDepotSuccessEffectArgs));

  readonly loadDepots = createEffect(() => initializeDepotsSlice({
    actions$: this.actions$,
    configApi: this.configApi,
    depotApi: this.depotApi
  } satisfies InitializeDepotsSliceEffectArgs));

  readonly loadDividends = createEffect(() => loadDividends({
    actions$: this.actions$,
    dividendApi: this.dividendApi,
    store: this.store
  } satisfies LoadDividendsEffectArgs));

  readonly loadPerformanceData = createEffect(() => loadDividendsPositions({
    actions$: this.actions$,
    depotPerformanceIncomeApi: this.depotPerformanceIncomeApi,
    depotPositionApi: this.depotPositionApi,
    dividendApi: this.dividendApi,
    store: this.store
  } satisfies LoadDividendsPositionsEffectArgs));

  readonly changeDepotSelection = createEffect(() => toggleDepotSelection({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies ChangeDepotSelectionEffectArgs));

  readonly selectDepotTab = createEffect(() => selectDepotTab({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies SelectDepotTabEffectArgs));

  readonly synchronizeDepotConfig = createEffect(() => synchronizeDepotConfig({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies SynchronizeDepotConfigEffectArgs));

  // depot.dividend effects

  readonly setDividendAggregationTimespan = createEffect(() => setDividendAggregationTimespan({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies DividendAggregationTimespanEffectArgs));

  readonly setIncludeSpecialDividends = createEffect(() => setIncludeSpecialDividends({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies IncludeSpecialDividendsEffectArgs));

  readonly setSelectedDividendView = createEffect(() => setSelectedDividendView({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies SetSelectedDividendViewEffectArgs));

  readonly setUseDividendGrossValues = createEffect(() => setUseDividendGrossValues({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies UseDividendGrossValuesEffectArgs));

  // depot.position effects

  readonly setSelectedPositionView = createEffect(() => setSelectedPositionView({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies SetSelectedPositionViewEffectArgs));

  readonly setUsePositionBuInValues = createEffect(() => setUsePositionBuyInValues({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies SetUsePositionBuyInValuesEffectArgs));

  readonly setPositionGroupBy = createEffect(() => setPositionGroupBy({
    actions$: this.actions$,
    configApi: this.configApi,
    store: this.store
  } satisfies SetPositionGroupByEffectArgs));

  // depot.performance effects

  readonly loadPerformance = createEffect(() => loadPerformance({
    actions$: this.actions$,
    depotPerformanceApi: this.depotPerformanceApi,
    store: this.store
  } satisfies LoadPerformanceEffectArgs))

  readonly reloadDepotsOn = createEffect(() => reloadDepotsOn({
    actions$: this.actions$
  } satisfies ReloadDepotsOnEffectArgs));
}
