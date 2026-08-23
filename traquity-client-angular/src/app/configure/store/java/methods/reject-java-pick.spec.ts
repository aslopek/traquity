import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {rejectJavaPick} from './reject-java-pick';

describe('rejectJavaPick', (): void => {
  const javaPath: string = 'C:\\jdk\\bin\\java.exe';

  let okVerification: JavaVerification;
  let store: SignalState<ConfigureStoreState>;

  beforeEach((): void => {
    okVerification = {status: 'ok', javaPath, versionOutput: 'openjdk 25'};
    store = signalState<ConfigureStoreState>({...initialState, javaPath, javaVerification: okVerification});
  });

  it('records the rejected pick', (): void => {
    rejectJavaPick(store, 'C:\\not-java\\bin\\java.exe', 'not a JVM');

    expect(getState(store)).toEqual({
      ...initialState,
      javaPath,
      javaVerification: okVerification,
      javaPickError: {setting: 'C:\\not-java\\bin\\java.exe', message: 'not a JVM'}
    });
  });

  it('leaves the current selection untouched', (): void => {
    const verificationBefore: JavaVerification = {...okVerification};

    rejectJavaPick(store, 'C:\\not-java\\bin\\java.exe', 'not a JVM');

    expect(getState(store).javaPath).toBe(javaPath);
    expect(getState(store).javaVerification).toEqual(verificationBefore);
    expect(getState(store).javaVerification).toBe(okVerification);
  });
});
