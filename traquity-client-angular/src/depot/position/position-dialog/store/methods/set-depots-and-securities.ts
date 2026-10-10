import {PositionDialogState} from '../position-dialog.store';
import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {DepotPositionApi, Lot} from '../../../../../gen/api/depot-position';
import {firstValueFrom} from 'rxjs';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {SecurityActions} from '../../../../../store/security/security.actions';

export type SetDepotsAndSecuritiesFunction = (depotIds: number[], securityIds: number[]) => Promise<void>;

export function setDepotsAndSecurities(signalStore: WritableSignalStore<PositionDialogState>,
                                       depotPositionApi: DepotPositionApi,
                                       globalStore: Store<AppState>): SetDepotsAndSecuritiesFunction {
  return async (depotIds: number[], securityIds: number[]): Promise<void> => {
    const lots: Lot[] = [];

    for (const depotId of depotIds) {
      for (const securityId of securityIds) {
        globalStore.dispatch(SecurityActions.loadSecurity({securityId}));
        try {
          lots.push(...await firstValueFrom(depotPositionApi.getLots(depotId, securityId)));
        } catch {
        }
      }
    }

    lots.sort((a: Lot, b: Lot): number => b.holdingPeriodInDays - a.holdingPeriodInDays);

    patchState(signalStore, {securityIds, depotIds, lots});
  };
}