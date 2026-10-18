import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {DividendAnnouncementConfigParams, DividendAnnouncementConfigState} from '../dividend-announcement-config-store';
import {patchState} from '@ngrx/signals';

export function setNewConfigValues(signalStore: WritableSignalStore<DividendAnnouncementConfigState>,
                                   newConfigValues: DividendAnnouncementConfigParams): void {
  patchState(signalStore, {
    newConfigValues,
    isDirty: true
  });
}
