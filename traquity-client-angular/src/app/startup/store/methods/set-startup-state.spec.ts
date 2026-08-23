import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {StartupState} from '../../../../bridge/startup-bridge.type';
import {initialState, StartupStoreState} from '../startup.store';
import {setStartupState} from './set-startup-state';

describe('setStartupState', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';

  let store: SignalState<StartupStoreState>;

  beforeEach((): void => {
    store = signalState<StartupStoreState>({...initialState});
  });

  it('enters the booting phase for boot mode', (): void => {
    const state: StartupState = {authState: 'passwordless', databasePath, mode: 'boot'};

    setStartupState(store, state);

    expect(getState(store)).toEqual({authState: 'passwordless', databasePath, mode: 'boot', phase: 'booting', startFailed: false});
  });

  it('enters the unlock phase for unlock mode (pending database)', (): void => {
    const state: StartupState = {authState: 'pending', databasePath, mode: 'unlock'};

    setStartupState(store, state);

    expect(getState(store)).toEqual({authState: 'pending', databasePath, mode: 'unlock', phase: 'unlock', startFailed: false});
  });

  it('\'enters the unlock phase for unlock mode (scrypt database)', (): void => {
    const state: StartupState = {authState: 'scrypt', databasePath, mode: 'unlock'};

    setStartupState(store, state);

    expect(getState(store)).toEqual({authState: 'scrypt', databasePath, mode: 'unlock', phase: 'unlock', startFailed: false});
  });

  it('enters the configure phase for configure mode', (): void => {
    const state: StartupState = {authState: 'pending', databasePath, mode: 'configure'};

    setStartupState(store, state);

    expect(getState(store)).toEqual({authState: 'pending', databasePath, mode: 'configure', phase: 'configure', startFailed: false});
  });

  it('enters the insecure phase for insecure mode, with a null database path and null auth state', (): void => {
    const state: StartupState = {authState: null, databasePath: null, mode: 'insecure'};

    setStartupState(store, state);

    expect(getState(store)).toEqual({authState: null, databasePath: null, mode: 'insecure', phase: 'insecure', startFailed: false});
  });

  it('records a null database path and null auth state when the config names no database', (): void => {
    const state: StartupState = {authState: null, databasePath: null, mode: 'configure'};

    setStartupState(store, state);

    expect(getState(store)).toEqual({authState: null, databasePath: null, mode: 'configure', phase: 'configure', startFailed: false});
  });
});
