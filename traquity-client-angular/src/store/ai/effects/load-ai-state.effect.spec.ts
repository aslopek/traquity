import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Action} from '@ngrx/store';
import {Actions} from '@ngrx/effects';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {ElectronAiState} from '../../../app/startup/startup-bridge.type';
import {AppActions} from '../../app.actions';
import {AiActions} from '../ai.actions';
import {loadAiState, LoadAiStateEffectArgs} from './load-ai-state.effect';

type MockedAiBridgeService = {
  available: boolean
  getState: jest.Mock<() => Observable<ElectronAiState>>
};

describe('loadAiState', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let stateResponseMarbles: string;
  let electronAiState: ElectronAiState;
  let getState: jest.Mock<() => Observable<ElectronAiState>>;
  let aiBridgeService: MockedAiBridgeService;
  let effectArgs: Omit<LoadAiStateEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): void {
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      getState.mockReturnValue(cold(stateResponseMarbles, {v: electronAiState}));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      expectObservable(loadAiState({actions$, ...effectArgs})).toBe(expectedMarbles, expectedValues);
    });
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    stateResponseMarbles = '---(v|)';
    electronAiState = {isConfirmed: true, catalogue: [], models: {}};

    actionValues = {
      a: AppActions.initialize()
    };

    getState = jest.fn<() => Observable<ElectronAiState>>();
    aiBridgeService = {
      available: true,
      getState
    };

    effectArgs = {aiBridgeService};
  });

  it('dispatches Load Ai State Done once the bridge reports the state', (): void => {
    expectEffect('----d', {d: AiActions.loadAiStateDone({electronAiState: electronAiState})});
    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith();
  });

  it('emits nothing when the bridge is not available', (): void => {
    aiBridgeService.available = false;

    expectEffect('');
    expect(getState).not.toHaveBeenCalled();
  });

  it('emits nothing when the bridge call fails', (): void => {
    stateResponseMarbles = '---#';

    expectEffect('');
  });
});
