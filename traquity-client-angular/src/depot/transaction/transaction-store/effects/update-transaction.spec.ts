import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {signalState, SignalState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {DepotActions} from '../../../../store/depot/depot.actions';
import {NotificationActions} from '../../../../store/notification/notification.actions';
import {TransactionApi, TransactionRead, TransactionUpdate} from '../../../../gen/api/depot-transaction';
import {transactionReadFactory} from '../../../../testing/transaction-read.factory';
import {replaceTransaction} from '../methods/replace-transaction';
import {initialState, TransactionPageState} from '../transaction-page.store';
import {updateTransactionPipe, UpdateTransactionArgs} from './update-transaction';

jest.mock('../methods/replace-transaction', () => ({
  replaceTransaction: jest.fn()
}));

type UpdateTransaction = (depotId: number, transactionId: number, update: TransactionUpdate) => Observable<TransactionRead>;
type MockedApi = Pick<TransactionApi, 'updateTransaction'>;
type MockedStore = Pick<Store<AppState>, 'dispatch'>;

describe('updateTransactionPipe', (): void => {
  let scheduler: TestScheduler;
  let store: SignalState<TransactionPageState>;
  let updateTransactionMock: jest.Mock<UpdateTransaction>;
  let api: MockedApi;
  let dispatchMock: jest.Mock<Store<AppState>['dispatch']>;
  let globalStore: MockedStore;
  let replaceTransactionMock: jest.Mock<typeof replaceTransaction>;
  let update: TransactionUpdate;
  let response: TransactionRead;
  let inputMarbles: string;
  let inputValues: Record<string, UpdateTransactionArgs>;
  let responseMarbles: string;
  let responseValues: Record<string, TransactionRead>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<TransactionPageState>({
      ...initialState,
      editedTransactionId: 3
    });

    updateTransactionMock = jest.fn<UpdateTransaction>();
    api = {
      updateTransaction: updateTransactionMock as unknown as MockedApi['updateTransaction']
    };

    dispatchMock = jest.fn() as jest.Mock<Store<AppState>['dispatch']>;
    globalStore = {
      dispatch: dispatchMock as unknown as MockedStore['dispatch']
    };

    replaceTransactionMock = replaceTransaction as jest.Mock<typeof replaceTransaction>;
    replaceTransactionMock.mockReset();

    update = transactionReadFactory({
      id: 3,
      grossValue: 2000
    });
    response = transactionReadFactory({
      id: 3,
      grossValue: 2000,
      version: 1
    });

    inputMarbles = 'a';
    inputValues = {
      a: {
        depotId: 7,
        transactionId: 3,
        update
      }
    };
    responseMarbles = '---(v|)';
    responseValues = {v: response};
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      updateTransactionMock.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<UpdateTransactionArgs> = hot<UpdateTransactionArgs>(inputMarbles, inputValues);
      updateTransactionPipe(store, api, globalStore as Store<AppState>)(source$).subscribe();
    });
  }

  it('saves the update, replaces the row with the saved transaction, ends edit mode and reloads the depots', (): void => {
    run();

    expect(updateTransactionMock).toHaveBeenCalledTimes(1);
    expect(updateTransactionMock).toHaveBeenCalledWith(7, 3, update);
    expect(replaceTransactionMock).toHaveBeenCalledTimes(1);
    expect(replaceTransactionMock).toHaveBeenCalledWith(store, response);
    expect(store.editedTransactionId()).toBeNull();
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(DepotActions.reloadDepots());
  });

  it('keeps edit mode and the row and dispatches exactly one error notification on failure', (): void => {
    responseMarbles = '---#';

    run();

    expect(replaceTransactionMock).not.toHaveBeenCalled();
    expect(store.editedTransactionId()).toBe(3);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(NotificationActions.addError({message: 'The transaction could not be saved.'}));
  });

  it('saves a later update after a failed one', (): void => {
    inputMarbles = 'a----a';

    scheduler.run(({cold, hot}: RunHelpers): void => {
      updateTransactionMock
        .mockReturnValueOnce(cold('-#'))
        .mockReturnValueOnce(cold(responseMarbles, responseValues));
      const source$: HotObservable<UpdateTransactionArgs> = hot<UpdateTransactionArgs>(inputMarbles, inputValues);
      updateTransactionPipe(store, api, globalStore as Store<AppState>)(source$).subscribe();
    });

    expect(updateTransactionMock.mock.calls).toEqual([
      [7, 3, update],
      [7, 3, update]
    ]);
    expect(replaceTransactionMock).toHaveBeenCalledTimes(1);
    expect(replaceTransactionMock).toHaveBeenCalledWith(store, response);
    expect(store.editedTransactionId()).toBeNull();
  });

  it('drops a save arriving while another one is in flight', (): void => {
    inputMarbles = 'ab';
    inputValues = {
      ...inputValues,
      b: {
        depotId: 7,
        transactionId: 3,
        update: transactionReadFactory({
          id: 3,
          grossValue: 3000
        })
      }
    };

    run();

    expect(updateTransactionMock).toHaveBeenCalledTimes(1);
    expect(updateTransactionMock).toHaveBeenCalledWith(7, 3, update);
  });
});
