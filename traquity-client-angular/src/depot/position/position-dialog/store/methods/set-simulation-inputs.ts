import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {PositionDialogState, SellSimulationInputs} from '../position-dialog.store';

export function setSimulationInputs(signalStore: WritableSignalStore<PositionDialogState>,
                                    simulationInputs: SellSimulationInputs | null): void {
  patchState(signalStore, {simulationInputs});
}
