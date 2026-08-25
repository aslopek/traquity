import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Action} from '@ngrx/store';
import {Actions} from '@ngrx/effects';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {AiBridgeService} from '../../../bridge/ai-bridge.service';
import {AiActivateOutcome, ElectronAiState} from '../../../bridge/ai-bridge.type';
import {AiActions} from '../ai.actions';
import {activateModel, ActivateModelEffectArgs} from './activate-model.effect';

type MockedAiBridgeService = Pick<AiBridgeService, 'activateModel' | 'getState'>;

describe('activateModel', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let activateResponseMarbles: string;
  let stateResponseMarbles: string;
  let activateOutcome: AiActivateOutcome;
  let electronAiState: ElectronAiState;
  let activateModelMock: jest.Mock<(key: string) => Observable<AiActivateOutcome>>;
  let getState: jest.Mock<() => Observable<ElectronAiState>>;
  let aiBridgeService: MockedAiBridgeService;
  let effectArgs: Omit<ActivateModelEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>, activateError?: unknown,
                        stateError?: unknown): void {
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      activateModelMock.mockReturnValue(cold(activateResponseMarbles, {o: activateOutcome}, activateError));
      getState.mockReturnValue(cold(stateResponseMarbles, {v: electronAiState}, stateError));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      expectObservable(activateModel({actions$, ...effectArgs})).toBe(expectedMarbles, expectedValues);
    });
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    activateResponseMarbles = '--(o|)';
    stateResponseMarbles = '--(v|)';
    activateOutcome = {status: 'activated'};
    electronAiState = {isConfirmed: true, catalogue: [], models: {}, verdicts: {}, probeFailed: false};

    actionValues = {
      a: AiActions.activateModel({key: 'model-a'})
    };

    activateModelMock = jest.fn<(key: string) => Observable<AiActivateOutcome>>();
    getState = jest.fn<() => Observable<ElectronAiState>>();
    aiBridgeService = {activateModel: activateModelMock, getState};

    effectArgs = {aiBridgeService};
  });

  it('activates the requested model with its key', (): void => {
    expectEffect('-----(ed)', {
      e: AiActions.loadAiStateDone({electronAiState}),
      d: AiActions.aiActivationFinished({key: 'model-a', outcome: activateOutcome})
    });
    expect(activateModelMock).toHaveBeenCalledTimes(1);
    expect(activateModelMock).toHaveBeenCalledWith('model-a');
  });

  it('re-reads the ai state through the bridge on an activated outcome', (): void => {
    expectEffect('-----(ed)', {
      e: AiActions.loadAiStateDone({electronAiState}),
      d: AiActions.aiActivationFinished({key: 'model-a', outcome: activateOutcome})
    });
    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith();
  });

  it('finishes on a failed outcome without re-reading the state', (): void => {
    activateOutcome = {status: 'failed', message: 'No installed model for model-a'};

    expectEffect('---d', {d: AiActions.aiActivationFinished({key: 'model-a', outcome: activateOutcome})});
    expect(getState).not.toHaveBeenCalled();
  });

  it('finishes with a failed outcome carrying the error message when the bridge call rejects', (): void => {
    activateResponseMarbles = '--#';

    expectEffect('---d', {
      d: AiActions.aiActivationFinished({key: 'model-a', outcome: {status: 'failed', message: 'unreachable'}})
    }, new Error('unreachable'));
    expect(getState).not.toHaveBeenCalled();
  });

  it('finishes with the activation outcome alone when re-reading the state fails', (): void => {
    stateResponseMarbles = '--#';

    expectEffect('-----d', {d: AiActions.aiActivationFinished({key: 'model-a', outcome: activateOutcome})}, undefined,
      new Error('unreachable'));
    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith();
  });
});
