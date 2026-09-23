import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {DepotPerformanceComputed, DepotPerformanceState} from "../depot-performance.store";
import {DataRange} from "../../../../common/types/data-range";
import {patchState} from "@ngrx/signals";

export function setDataRange(signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>, dataRange: DataRange): void {
  const currentShowInvestedCapital: boolean = signalStore.showInvestedCapital();
  let newShowInvestedCapital: boolean;
  if (dataRange === 'max') {
    newShowInvestedCapital = true;
  } else {
    if (signalStore.dataRange() === 'max') {
      newShowInvestedCapital = false;
    } else {
      newShowInvestedCapital = currentShowInvestedCapital;
    }
  }

  patchState(signalStore, {
    dataRange,
    showInvestedCapital: newShowInvestedCapital
  });
}
