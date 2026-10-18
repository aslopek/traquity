import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {AddSecurityWizardState} from '../add-security-wizard.store';

export function masterDataStepOk(signalStore: ReadableSignalStore<AddSecurityWizardState>): boolean {
  return signalStore.masterData() !== null;
}
