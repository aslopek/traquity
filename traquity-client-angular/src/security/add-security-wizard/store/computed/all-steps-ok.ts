import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {AddSecurityWizardState} from '../add-security-wizard.store';
import {masterDataStepOk} from './master-data-step-ok';

export function allStepsOk(signalStore: ReadableSignalStore<AddSecurityWizardState>): boolean {
  return masterDataStepOk(signalStore)
    && signalStore.historicalSecurityPriceConfigStepOk()
    && signalStore.dividendAnnouncementConfigStepOk();
}
