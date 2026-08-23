import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, WritableSignal} from '@angular/core';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../bridge/startup-bridge.service';
import {AuthState} from '../../../../bridge/startup-bridge.type';
import {setPasswordMatches} from '../methods/set-password-matches';
import {initialState, UnlockState} from '../unlock.store';
import {PASSWORD_VERITQ_DEBOUNCE_MS, verifyPasswordPipe} from './verify-password';

jest.mock('../methods/set-password-matches', () => ({
  setPasswordMatches: jest.fn()
}));

type VerifyPassword = (password: string) => Observable<boolean>;
type SetPasswordMatches = (signalStore: WritableSignalStore<UnlockState>, passwordMatches: boolean) => void;

describe('verifyPasswordPipe', (): void => {
  const debounceGap: string = '-'.repeat(PASSWORD_VERITQ_DEBOUNCE_MS);

  let scheduler: TestScheduler;
  let store: SignalState<UnlockState>;
  let verifyPasswordMock: jest.Mock<VerifyPassword>;
  let bridge: Pick<StartupBridgeService, 'verifyPassword'>;
  let authState: WritableSignal<AuthState | null>;
  let startupStore: { authState: WritableSignal<AuthState | null> };
  let setPasswordMatchesMock: jest.Mock<SetPasswordMatches>;
  let inputMarbles: string;
  let inputValues: Record<string, string>;
  let responseMarbles: string;
  let responseValues: Record<string, boolean>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<UnlockState>({...initialState});
    authState = signal<AuthState | null>('scrypt');
    startupStore = {authState};

    verifyPasswordMock = jest.fn<VerifyPassword>();
    bridge = {verifyPassword: verifyPasswordMock};

    setPasswordMatchesMock = setPasswordMatches as jest.Mock<SetPasswordMatches>;
    setPasswordMatchesMock.mockReset();

    inputMarbles = 'a';
    inputValues = {a: 'hunter2'};
    responseMarbles = '(v|)';
    responseValues = {v: true};
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      verifyPasswordMock.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<string> = hot<string>(inputMarbles, inputValues);
      verifyPasswordPipe(store, bridge, startupStore)(source$).subscribe();
    });
  }

  it('reports a matching answer', (): void => {
    run();

    expect(setPasswordMatchesMock).toHaveBeenCalledTimes(1);
    expect(setPasswordMatchesMock).toHaveBeenCalledWith(store, true);
  });

  it('reports a non-matching answer', (): void => {
    responseValues = {v: false};

    run();

    expect(setPasswordMatchesMock).toHaveBeenCalledTimes(1);
    expect(setPasswordMatchesMock).toHaveBeenCalledWith(store, false);
  });

  it('reports a rejected bridge call as non-matching', (): void => {
    responseMarbles = '#';

    run();

    expect(setPasswordMatchesMock).toHaveBeenCalledTimes(1);
    expect(setPasswordMatchesMock).toHaveBeenCalledWith(store, false);
  });

  it('debounces a burst of input to one bridge call carrying the last value', (): void => {
    inputMarbles = `a-----b`;
    inputValues = {a: 'first', b: 'second'};

    run();

    expect(verifyPasswordMock).toHaveBeenCalledTimes(1);
    expect(verifyPasswordMock).toHaveBeenCalledWith('second');
  });

  it('verifies a value again once the input stands still for the debounce gap', (): void => {
    inputMarbles = `a${debounceGap}b`;
    inputValues = {a: 'first', b: 'second'};

    run();

    expect(verifyPasswordMock.mock.calls).toEqual([
      ['first'],
      ['second']
    ]);
  });

  describe('when the auth state is pending', (): void => {
    beforeEach((): void => {
      authState.set('pending');
    });

    it('makes no bridge call at all and reports nothing', (): void => {
      run();

      expect(verifyPasswordMock).not.toHaveBeenCalled();
      expect(setPasswordMatchesMock).not.toHaveBeenCalled();
    });
  });
});
