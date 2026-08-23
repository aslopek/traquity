import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Router} from '@angular/router';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../bridge/startup-bridge.service';
import {BackendStartOutcome} from '../../../../bridge/startup-bridge.type';
import {applyStartOutcome} from '../methods/apply-start-outcome';
import {enterBooting} from '../methods/enter-booting';
import {initialState, StartupComputed, StartupStoreState} from '../startup.store';
import {startBackendPipe} from './start-backend';

jest.mock('../methods/apply-start-outcome', () => ({
  applyStartOutcome: jest.fn()
}));
jest.mock('../methods/enter-booting', () => ({
  enterBooting: jest.fn()
}));

type StartBackend = (password: string) => Observable<BackendStartOutcome>;
type EnterBooting = (signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                     router: Pick<Router, 'navigate'>) => void;
type ApplyStartOutcome = (signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                          router: Pick<Router, 'navigate'>, outcome: BackendStartOutcome) => void;

describe('startBackendPipe', (): void => {
  let scheduler: TestScheduler;
  let store: SignalState<StartupStoreState>;
  let startBackendMock: jest.Mock<StartBackend>;
  let bridge: Pick<StartupBridgeService, 'startBackend'>;
  let router: Pick<Router, 'navigate'>;
  let enterBootingMock: jest.Mock<EnterBooting>;
  let applyStartOutcomeMock: jest.Mock<ApplyStartOutcome>;
  let inputMarbles: string;
  let inputValues: Record<string, string>;
  let responseMarbles: string;
  let responseValues: Record<string, BackendStartOutcome>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<StartupStoreState>({...initialState});
    startBackendMock = jest.fn<StartBackend>();
    bridge = {startBackend: startBackendMock};
    router = {navigate: jest.fn<Router['navigate']>()};

    enterBootingMock = enterBooting as jest.Mock<EnterBooting>;
    enterBootingMock.mockReset();
    applyStartOutcomeMock = applyStartOutcome as jest.Mock<ApplyStartOutcome>;
    applyStartOutcomeMock.mockReset();

    inputMarbles = 'a';
    inputValues = {
      a: 'hunter2',
      b: 'correct horse'
    };
    responseMarbles = '--(v|)';
    responseValues = {
      v: {
        reachable: true,
        startedFrom: 'scrypt'
      }
    };
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      startBackendMock.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<string> = hot<string>(inputMarbles, inputValues);
      startBackendPipe(store, bridge, router)(source$).subscribe();
    });
  }

  it('enters the booting phase and starts the backend with the password', (): void => {
    run();

    expect(enterBootingMock).toHaveBeenCalledTimes(1);
    expect(enterBootingMock).toHaveBeenCalledWith(store, router);
    expect(startBackendMock).toHaveBeenCalledTimes(1);
    expect(startBackendMock).toHaveBeenCalledWith('hunter2');
  });

  it('applies the outcome the bridge reports', (): void => {
    run();

    expect(applyStartOutcomeMock).toHaveBeenCalledTimes(1);
    expect(applyStartOutcomeMock).toHaveBeenCalledWith(store, router, {
      reachable: true,
      startedFrom: 'scrypt'
    });
  });

  it('applies an unreachable outcome the same way', (): void => {
    responseValues = {
      v: {
        reachable: false,
        startedFrom: 'scrypt'
      }
    };

    run();

    expect(applyStartOutcomeMock).toHaveBeenCalledTimes(1);
    expect(applyStartOutcomeMock).toHaveBeenCalledWith(store, router, {
      reachable: false,
      startedFrom: 'scrypt'
    });
  });

  it('applies nothing while the start is still in flight', (): void => {
    responseMarbles = '-';

    run();

    expect(enterBootingMock).toHaveBeenCalledTimes(1);
    expect(enterBootingMock).toHaveBeenCalledWith(store, router);
    expect(applyStartOutcomeMock).not.toHaveBeenCalled();
  });

  it('applies nothing when the bridge call is rejected', (): void => {
    responseMarbles = '--#';

    run();

    expect(enterBootingMock).toHaveBeenCalledTimes(1);
    expect(enterBootingMock).toHaveBeenCalledWith(store, router);
    expect(applyStartOutcomeMock).not.toHaveBeenCalled();
  });

  it('drops a second start while one is in flight, having entered the booting phase for it', (): void => {
    inputMarbles = 'a-b';

    run();

    expect(enterBootingMock.mock.calls).toEqual([
      [store, router],
      [store, router]
    ]);
    expect(startBackendMock).toHaveBeenCalledTimes(1);
    expect(startBackendMock).toHaveBeenCalledWith(inputValues['a']);
    expect(applyStartOutcomeMock).toHaveBeenCalledTimes(1);
    expect(applyStartOutcomeMock).toHaveBeenCalledWith(store, router, responseValues['v']);
  });

  it('starts again once the previous start has finished', (): void => {
    inputMarbles = 'a----b';

    run();

    expect(startBackendMock.mock.calls).toEqual([
      [inputValues['a']],
      [inputValues['b']]
    ]);
    expect(applyStartOutcomeMock.mock.calls).toEqual([
      [store, router, responseValues['v']],
      [store, router, responseValues['v']]
    ]);
  });
});
