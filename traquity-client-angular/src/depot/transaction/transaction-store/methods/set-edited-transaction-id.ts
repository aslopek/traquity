import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {TransactionPageState} from '../transaction-page.store';

export function setEditedTransactionId(signalStore: WritableSignalStore<TransactionPageState>, editedTransactionId: number | null): void {
  patchState(signalStore, {editedTransactionId});
}
