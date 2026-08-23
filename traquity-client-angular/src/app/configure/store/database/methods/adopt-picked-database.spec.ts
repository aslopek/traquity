import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {PickedDatabase} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {adoptPickedDatabase} from './adopt-picked-database';
import {selectExistingDatabase} from './select-existing-database';
import {selectNewDatabase} from './select-new-database';

jest.mock('./select-existing-database', () => ({
  selectExistingDatabase: jest.fn()
}));

jest.mock('./select-new-database', () => ({
  selectNewDatabase: jest.fn()
}));

type SelectDatabase = (signalStore: WritableSignalStore<ConfigureStoreState>, databasePath: string) => void;

describe('adoptPickedDatabase', (): void => {
  const basePath: string = 'D:\\backup\\traquity-new';

  let store: SignalState<ConfigureStoreState>;
  let picked: PickedDatabase;
  let selectExistingDatabaseMock: jest.Mock<SelectDatabase>;
  let selectNewDatabaseMock: jest.Mock<SelectDatabase>;

  beforeEach((): void => {
    store = signalState<ConfigureStoreState>({...initialState});
    picked = {basePath, fileExists: false};

    selectExistingDatabaseMock = selectExistingDatabase as jest.Mock<SelectDatabase>;
    selectExistingDatabaseMock.mockReset();
    selectNewDatabaseMock = selectNewDatabase as jest.Mock<SelectDatabase>;
    selectNewDatabaseMock.mockReset();
  });

  it('treats a file that is not there yet as one created here', (): void => {
    adoptPickedDatabase(store, picked);

    expect(selectNewDatabaseMock).toHaveBeenCalledTimes(1);
    expect(selectNewDatabaseMock).toHaveBeenCalledWith(store, basePath);
    expect(selectExistingDatabaseMock).not.toHaveBeenCalled();
  });

  it('treats a file that is already there as a picked one', (): void => {
    picked = {basePath, fileExists: true};

    adoptPickedDatabase(store, picked);

    expect(selectExistingDatabaseMock).toHaveBeenCalledTimes(1);
    expect(selectExistingDatabaseMock).toHaveBeenCalledWith(store, basePath);
    expect(selectNewDatabaseMock).not.toHaveBeenCalled();
  });
});
