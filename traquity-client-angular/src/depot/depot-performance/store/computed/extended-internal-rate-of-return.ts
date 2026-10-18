import {computed, Signal} from '@angular/core';
import {DepotPerformance} from '../../../../gen/api/depot-performance';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {depotPerformance as depotPerformanceSelector} from '../../../../store/depot/depot.selector';

export function extendedInternalRateOfReturn(globalStore: Store<AppState>): Signal<number> {
  const depotPerformance: Signal<DepotPerformance | null> = globalStore.selectSignal(depotPerformanceSelector);
  return computed<number>((): number => {
    return depotPerformance()?.extendedInternalRateOfReturn ?? 0;
  });
}