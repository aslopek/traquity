import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {startJavaVerification} from './start-java-verification';

describe('startJavaVerification', (): void => {
  let store: SignalState<ConfigureStoreState>;

  beforeEach((): void => {
    const okVerification: JavaVerification = {status: 'ok', javaPath: 'C:\\jdk\\bin\\java.exe', versionOutput: 'openjdk 25'};
    store = signalState<ConfigureStoreState>({...initialState, javaVerification: okVerification});
  });

  it('resets the verification to null', (): void => {
    startJavaVerification(store);

    expect(getState(store)).toEqual({...initialState, javaVerification: null});
  });
});
