import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal} from '@angular/core';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {StartupBridgeService} from '../../../../bridge/startup-bridge.service';
import {AppliedConfiguration, ConfigurationChanges} from '../../../../bridge/startup-bridge.type';
import {DatabaseSelection} from '../../../startup/store/methods/select-database';
import {ConfigureStoreState, initialState} from '../configure.store';
import {ContinuableStartupStore, continueStartup} from '../routing/continue-startup';
import {SelectionOrigin} from '../routing/next-startup-step';
import {saveAndStartPipe} from './save-and-start';

jest.mock('../routing/continue-startup', () => ({
  continueStartup: jest.fn()
}));

type ApplyConfiguration = (changes: ConfigurationChanges) => Observable<AppliedConfiguration>;
type ContinueStartup = (startupStore: ContinuableStartupStore, selection: DatabaseSelection, origin: SelectionOrigin,
                        definedPassword?: string) => void;

describe('saveAndStartPipe', (): void => {
  const databasePath: string = 'D:\\backup\\traquity-new';

  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let applyConfiguration: jest.Mock<ApplyConfiguration>;
  let bridge: Pick<StartupBridgeService, 'applyConfiguration'>;
  let startupStore: ContinuableStartupStore;
  let continueStartupMock: jest.Mock<ContinueStartup>;
  let inputMarbles: string;
  let responseMarbles: string;
  let responseValues: Record<string, AppliedConfiguration>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<ConfigureStoreState>({
      ...initialState,
      password: 'hunter2',
      passwordConfirmation: 'hunter2',
      selectedDatabasePath: databasePath,
      selectionOrigin: 'created'
    });
    applyConfiguration = jest.fn<ApplyConfiguration>();
    bridge = {applyConfiguration};
    startupStore = {
      enterUnlock: jest.fn<() => void>(),
      selectDatabase: jest.fn<(selection: DatabaseSelection) => void>(),
      startBackend: jest.fn<(password: string) => void>()
    };

    continueStartupMock = continueStartup as jest.Mock<ContinueStartup>;
    continueStartupMock.mockReset();

    inputMarbles = 'a';
    responseMarbles = '----(v|)';
    responseValues = {v: {databasePath, authState: 'pending'}};
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      applyConfiguration.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {
        a: undefined,
        b: undefined
      });
      saveAndStartPipe(store, bridge, startupStore, store.selectedDatabasePath, signal<string | null>(null), signal<string | null>(null))
      (source$).subscribe();
    });
  }

  it('persists the changes and continues from what the write reports, with the password defined here', (): void => {
    run();

    expect(applyConfiguration).toHaveBeenCalledTimes(1);
    expect(applyConfiguration).toHaveBeenCalledWith({databasePath, javaPath: null, javaSignature: null});
    expect(continueStartupMock).toHaveBeenCalledTimes(1);
    expect(continueStartupMock).toHaveBeenCalledWith(startupStore, {databasePath, authState: 'pending'}, 'created', 'hunter2');
  });

  it('includes the java path and signature in the changes', (): void => {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      applyConfiguration.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {a: undefined, b: undefined});
      const javaPath = signal<string | null>('C:\\jdk\\bin\\java.exe');
      const javaSignature = signal<string | null>('c2ln');

      saveAndStartPipe(store, bridge, startupStore, store.selectedDatabasePath, javaPath, javaSignature)(source$).subscribe();
    });

    expect(applyConfiguration).toHaveBeenCalledTimes(1);
    expect(applyConfiguration).toHaveBeenCalledWith({databasePath, javaPath: 'C:\\jdk\\bin\\java.exe', javaSignature: 'c2ln'});
  });

  // the origin decides whether that password may be used at all, so it travels with the handover
  it('continues with the origin the selection was made with', (): void => {
    store = signalState<ConfigureStoreState>({...store(), selectionOrigin: 'picked'});

    run();

    expect(continueStartupMock).toHaveBeenCalledTimes(1);
    expect(continueStartupMock).toHaveBeenCalledWith(startupStore, {databasePath, authState: 'pending'}, 'picked', 'hunter2');
  });

  it('continues with the auth state the write reports', (): void => {
    responseValues = {v: {databasePath, authState: 'passwordless'}};

    run();

    expect(continueStartupMock).toHaveBeenCalledTimes(1);
    expect(continueStartupMock).toHaveBeenCalledWith(startupStore, {databasePath, authState: 'passwordless'}, 'created', 'hunter2');
  });

  it('continues nothing before the write has gone through', (): void => {
    responseMarbles = '-';

    run();

    expect(continueStartupMock).not.toHaveBeenCalled();
  });

  it('drops a second click while the write is in flight', (): void => {
    inputMarbles = 'a-b';

    run();

    expect(applyConfiguration).toHaveBeenCalledTimes(1);
    expect(applyConfiguration).toHaveBeenCalledWith({databasePath, javaPath: null, javaSignature: null});
  });

  it('writes nothing while no database is selected', (): void => {
    store = signalState<ConfigureStoreState>({
      ...store(),
      selectedDatabasePath: null
    });

    run();

    expect(applyConfiguration).not.toHaveBeenCalled();
    expect(continueStartupMock).not.toHaveBeenCalled();
  });
});
