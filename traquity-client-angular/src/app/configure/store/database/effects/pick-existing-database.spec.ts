import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../../bridge/startup-bridge.service';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {selectExistingDatabase} from '../methods/select-existing-database';
import {pickExistingDatabasePipe} from './pick-existing-database';

jest.mock('../methods/select-existing-database', () => ({
  selectExistingDatabase: jest.fn()
}));

type PickExistingDatabase = (currentSelection: string | null) => Observable<string | null>;
type SelectExistingDatabase = (signalStore: WritableSignalStore<ConfigureStoreState>, databasePath: string) => void;

describe('pickExistingDatabasePipe', (): void => {
  const currentSelection: string = 'C:\\Users\\x\\traquity';
  const pickedDatabasePath: string = 'D:\\backup\\traquity-test';

  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let pickExistingDatabase: jest.Mock<PickExistingDatabase>;
  let bridge: Pick<StartupBridgeService, 'pickExistingDatabase'>;
  let selectExistingDatabaseMock: jest.Mock<SelectExistingDatabase>;
  let inputMarbles: string;
  let responseMarbles: string;
  let responseValues: Record<string, string | null>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<ConfigureStoreState>({
      ...initialState,
      selectedDatabasePath: currentSelection
    });
    pickExistingDatabase = jest.fn<PickExistingDatabase>();
    bridge = {pickExistingDatabase};

    selectExistingDatabaseMock = selectExistingDatabase as jest.Mock<SelectExistingDatabase>;
    selectExistingDatabaseMock.mockReset();

    inputMarbles = 'a';
    responseMarbles = '----(v|)';
    responseValues = {v: pickedDatabasePath, n: null};
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      pickExistingDatabase.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {
        a: undefined,
        b: undefined
      });
      pickExistingDatabasePipe(store, bridge, store.selectedDatabasePath)(source$).subscribe();
    });
  }

  it('opens the dialog where the selection is and adopts the picked database as an existing one', (): void => {
    run();

    expect(pickExistingDatabase).toHaveBeenCalledTimes(1);
    expect(pickExistingDatabase).toHaveBeenCalledWith(currentSelection);
    expect(selectExistingDatabaseMock).toHaveBeenCalledTimes(1);
    expect(selectExistingDatabaseMock).toHaveBeenCalledWith(store, pickedDatabasePath);
  });

  it('opens the dialog without a location while nothing is selected and still adopts the picked database', (): void => {
    store = signalState<ConfigureStoreState>({...initialState});

    run();

    expect(pickExistingDatabase).toHaveBeenCalledTimes(1);
    expect(pickExistingDatabase).toHaveBeenCalledWith(null);
    expect(selectExistingDatabaseMock).toHaveBeenCalledTimes(1);
    expect(selectExistingDatabaseMock).toHaveBeenCalledWith(store, pickedDatabasePath);
  });

  it('adopts nothing when the dialog is cancelled', (): void => {
    responseMarbles = '----(n|)';

    run();

    expect(selectExistingDatabaseMock).not.toHaveBeenCalled();
  });

  it('adopts nothing before the dialog answers', (): void => {
    responseMarbles = '-';

    run();

    expect(selectExistingDatabaseMock).not.toHaveBeenCalled();
  });

  it('drops a second click while the dialog is open', (): void => {
    inputMarbles = 'a-b';

    run();

    expect(pickExistingDatabase).toHaveBeenCalledTimes(1);
    expect(pickExistingDatabase).toHaveBeenCalledWith(currentSelection);
  });
});
