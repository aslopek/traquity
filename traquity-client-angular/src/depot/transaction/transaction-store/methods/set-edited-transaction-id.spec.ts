import {beforeEach, describe, expect, it} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {initialState, TransactionPageState} from '../transaction-page.store';
import {setEditedTransactionId} from './set-edited-transaction-id';

describe('setEditedTransactionId', (): void => {
  let store: SignalState<TransactionPageState>;

  beforeEach((): void => {
    store = signalState<TransactionPageState>({...initialState});
  });

  it('stores the given id', (): void => {
    setEditedTransactionId(store, 3);

    expect(store.editedTransactionId()).toBe(3);
  });

  it('clears the id', (): void => {
    store = signalState<TransactionPageState>({
      ...initialState,
      editedTransactionId: 3
    });

    setEditedTransactionId(store, null);

    expect(store.editedTransactionId()).toBeNull();
  });
});
