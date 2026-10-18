import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {UpdateSecurityState} from '../update-security.store';
import {DividendAnnouncementConfigChangedEvent} from '../../../details/dividend-announcement/dividend-announcement-config.component';
import {patchState} from '@ngrx/signals';

export function setDividendAnnouncementConfig(signalStore: WritableSignalStore<UpdateSecurityState>,
                                              config: DividendAnnouncementConfigChangedEvent | null): void {
  patchState(signalStore, {
    dividendAnnouncementConfig: config,
    dividendAnnouncementConfigTouched: true
  });
}
