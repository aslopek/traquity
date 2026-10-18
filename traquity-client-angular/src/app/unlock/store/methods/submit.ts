import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {ReadableStartupStore} from '../../../startup/store/startup.store';
import {UnlockComputed, UnlockState} from '../unlock.store';

/**
 * The single guarded entry point for starting the backend: while `canSubmit` is false this does nothing at all.
 * The guard belongs here rather than to whatever triggers it - a disabled control blocks one way of submitting, and
 * the method has to hold for every other way too, or an unverified password would reach the backend.
 */
export function submit(signalStore: ReadableSignalStore<Pick<UnlockState, 'password'>, Pick<UnlockComputed, 'canSubmit'>>,
                       startupStore: Pick<ReadableStartupStore, 'startBackend'>): void {
  if (!signalStore.canSubmit()) {
    return;
  }
  startupStore.startBackend(signalStore.password());
}
