import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {AddSecurityWizardState} from '../add-security-wizard.store';
import {DividendAnnouncementConfigCreate} from '../../../../gen/api/notification/dividend-announcement';
import {patchState} from '@ngrx/signals';

export function setDividendAnnouncementConfig(signalStore: WritableSignalStore<AddSecurityWizardState>,
                                              dividendAnnouncementConfig: DividendAnnouncementConfigCreate | null): void {
  patchState(signalStore, {
    dividendAnnouncementConfig,
    dividendAnnouncementConfigStepOk: dividendAnnouncementConfig != null
  });
}
