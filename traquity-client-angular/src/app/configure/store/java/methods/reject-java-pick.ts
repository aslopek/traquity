import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/**
 * Records a rejected 'Custom path…' pick under that option alone - the status line, and with it the current
 * selection, is untouched, so a bad pick never disturbs a setting that already works.
 */
export function rejectJavaPick(signalStore: WritableSignalStore<ConfigureStoreState>, setting: string, message: string): void {
  patchState(signalStore, {javaPickError: {setting, message}});
}
