import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/** Marks a verification as pending, ahead of the `java:verify` call it is for. */
export function startJavaVerification(signalStore: WritableSignalStore<ConfigureStoreState>): void {
  patchState(signalStore, {javaVerification: null});
}
