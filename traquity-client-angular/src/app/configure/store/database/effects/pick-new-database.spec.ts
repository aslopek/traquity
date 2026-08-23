import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../../bridge/startup-bridge.service';
import {PickedDatabase} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {adoptPickedDatabase} from '../methods/adopt-picked-database';
import {pickNewDatabasePipe} from './pick-new-database';

jest.mock('../methods/adopt-picked-database', () => ({
  adoptPickedDatabase: jest.fn()
}));

type PickNewDatabase = (currentSelection: string | null) => Observable<PickedDatabase | null>;
type AdoptPickedDatabase = (signalStore: WritableSignalStore<ConfigureStoreState>, picked: PickedDatabase) => void;

describe('pickNewDatabasePipe', (): void => {
  const currentSelection: string = 'C:\\Users\\x\\traquity';
  const pickedDatabase: PickedDatabase = {basePath: 'D:\\backup\\traquity-new', fileExists: false};

  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let pickNewDatabase: jest.Mock<PickNewDatabase>;
  let bridge: Pick<StartupBridgeService, 'pickNewDatabase'>;
  let adoptPickedDatabaseMock: jest.Mock<AdoptPickedDatabase>;
  let inputMarbles: string;
  let responseMarbles: string;
  let responseValues: Record<string, PickedDatabase | null>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<ConfigureStoreState>({
      ...initialState,
      selectedDatabasePath: currentSelection
    });
    pickNewDatabase = jest.fn<PickNewDatabase>();
    bridge = {pickNewDatabase};

    adoptPickedDatabaseMock = adoptPickedDatabase as jest.Mock<AdoptPickedDatabase>;
    adoptPickedDatabaseMock.mockReset();

    inputMarbles = 'a';
    responseMarbles = '----(v|)';
    responseValues = {v: pickedDatabase, n: null};
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      pickNewDatabase.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {
        a: undefined,
        b: undefined
      });
      pickNewDatabasePipe(store, bridge, store.selectedDatabasePath)(source$).subscribe();
    });
  }

  it('opens the dialog where the selection is and hands the picked file over for adoption', (): void => {
    run();

    expect(pickNewDatabase).toHaveBeenCalledTimes(1);
    expect(pickNewDatabase).toHaveBeenCalledWith(currentSelection);
    expect(adoptPickedDatabaseMock).toHaveBeenCalledTimes(1);
    expect(adoptPickedDatabaseMock).toHaveBeenCalledWith(store, pickedDatabase);
  });

  it('opens the dialog without a location while nothing is selected and still hands the picked file over', (): void => {
    store = signalState<ConfigureStoreState>({...initialState});

    run();

    expect(pickNewDatabase).toHaveBeenCalledTimes(1);
    expect(pickNewDatabase).toHaveBeenCalledWith(null);
    expect(adoptPickedDatabaseMock).toHaveBeenCalledTimes(1);
    expect(adoptPickedDatabaseMock).toHaveBeenCalledWith(store, pickedDatabase);
  });

  it('adopts nothing when the dialog is cancelled', (): void => {
    responseMarbles = '----(n|)';

    run();

    expect(adoptPickedDatabaseMock).not.toHaveBeenCalled();
  });

  it('adopts nothing before the dialog answers', (): void => {
    responseMarbles = '-';

    run();

    expect(adoptPickedDatabaseMock).not.toHaveBeenCalled();
  });

  it('drops a second click while the dialog is open', (): void => {
    inputMarbles = 'a-b';

    run();

    expect(pickNewDatabase).toHaveBeenCalledTimes(1);
    expect(pickNewDatabase).toHaveBeenCalledWith(currentSelection);
  });
});
