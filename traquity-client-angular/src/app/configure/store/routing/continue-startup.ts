import {DatabaseSelection} from '../../../startup/store/methods/select-database';
import {ReadableStartupStore} from '../../../startup/store/startup.store';
import {nextStartupStep, SelectionOrigin, StartupStep} from './next-startup-step';

export type ContinuableStartupStore = Pick<ReadableStartupStore, 'enterUnlock' | 'selectDatabase' | 'startBackend'>;

/**
 * The handover back to the startup flow: adopt the selected database, then either start the backend or go prove its
 * password. One function, so that no way out of the configuration can grow a second version of that sequence.
 */
export function continueStartup(startupStore: ContinuableStartupStore,
                                selection: DatabaseSelection,
                                origin: SelectionOrigin,
                                definedPassword?: string): void {
  startupStore.selectDatabase(selection);

  const step: StartupStep = nextStartupStep(origin, selection.authState, definedPassword);
  if (step.action === 'start') {
    startupStore.startBackend(step.password);
    return;
  }
  startupStore.enterUnlock();
}
