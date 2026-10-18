import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {computed, Signal} from '@angular/core';
import {DepotPerformance} from '../../../../gen/api/depot-performance';
import {depotPerformance as depotPerformanceSelector} from '../../../../store/depot/depot.selector';
import {format} from 'date-fns';
import {RebasedDepotValue} from './rebased-depot-value.type';

export type DataRanges = {
  firstDate: string
  firstDateInDataRange: string
  lastDateInDataRange: string
};

export function dataRanges(globalStore: Store<AppState>,
                           depotValuesSignal: Signal<RebasedDepotValue[]>): Signal<DataRanges> {
  const depotPerformance: Signal<DepotPerformance | null> = globalStore.selectSignal(depotPerformanceSelector);

  return computed<DataRanges>((): DataRanges => {
    const depotValues = depotPerformance()?.values ?? [];
    const filteredDepotValues: RebasedDepotValue[] = depotValuesSignal();

    if (depotValues.length === 0 || filteredDepotValues.length === 0) {
      return {
        firstDate: format(new Date(), 'yyyy-MM-dd'),
        firstDateInDataRange: format(new Date(), 'yyyy-MM-dd'),
        lastDateInDataRange: format(new Date(), 'yyyy-MM-dd')
      };
    }

    return {
      firstDate: depotValues[0].date,
      firstDateInDataRange: filteredDepotValues[0].date,
      lastDateInDataRange: filteredDepotValues[filteredDepotValues.length - 1].date,
    };
  });
}