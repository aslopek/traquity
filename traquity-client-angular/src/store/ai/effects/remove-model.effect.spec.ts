import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Action} from '@ngrx/store';
import {Actions} from '@ngrx/effects';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {AiBridgeService} from '../../../bridge/ai-bridge.service';
import {AiRemoveOutcome, ElectronAiState} from '../../../bridge/ai-bridge.type';
import {AiActions} from '../ai.actions';
import {removeModel, RemoveModelEffectArgs} from './remove-model.effect';

type MockedAiBridgeService = Pick<AiBridgeService, 'removeModel' | 'getState'>;

describe('removeModel', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let removeResponseMarbles: string;
  let stateResponseMarbles: string;
  let removeOutcome: AiRemoveOutcome;
  let electronAiState: ElectronAiState;
  let removeModelMock: jest.Mock<(key: string) => Observable<AiRemoveOutcome>>;
  let getState: jest.Mock<() => Observable<ElectronAiState>>;
  let aiBridgeService: MockedAiBridgeService;
  let effectArgs: Omit<RemoveModelEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>, removeError?: unknown,
                        stateError?: unknown): void {
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      removeModelMock.mockReturnValue(cold(removeResponseMarbles, {o: removeOutcome}, removeError));
      getState.mockReturnValue(cold(stateResponseMarbles, {v: electronAiState}, stateError));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      expectObservable(removeModel({actions$, ...effectArgs})).toBe(expectedMarbles, expectedValues);
    });
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    removeResponseMarbles = '--(o|)';
    stateResponseMarbles = '--(v|)';
    removeOutcome = {status: 'removed'};
    electronAiState = {isConfirmed: true, catalogue: [], models: {}, verdicts: {}, probeFailed: false};

    actionValues = {
      a: AiActions.removeModel({key: 'model-a'})
    };

    removeModelMock = jest.fn<(key: string) => Observable<AiRemoveOutcome>>();
    getState = jest.fn<() => Observable<ElectronAiState>>();
    aiBridgeService = {removeModel: removeModelMock, getState};

    effectArgs = {aiBridgeService};
  });

  it('removes the requested model with its key', (): void => {
    expectEffect('-----(ed)', {
      e: AiActions.loadAiStateDone({electronAiState}),
      d: AiActions.aiRemovalFinished({key: 'model-a', outcome: removeOutcome})
    });
    expect(removeModelMock).toHaveBeenCalledTimes(1);
    expect(removeModelMock).toHaveBeenCalledWith('model-a');
  });

  it('re-reads the ai state through the bridge on a removed outcome', (): void => {
    expectEffect('-----(ed)', {
      e: AiActions.loadAiStateDone({electronAiState}),
      d: AiActions.aiRemovalFinished({key: 'model-a', outcome: removeOutcome})
    });
    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith();
  });

  it('finishes on a failed outcome without re-reading the state', (): void => {
    removeOutcome = {status: 'failed', message: 'No installed model for model-a'};

    expectEffect('---d', {d: AiActions.aiRemovalFinished({key: 'model-a', outcome: removeOutcome})});
    expect(getState).not.toHaveBeenCalled();
  });

  it('finishes with a failed outcome carrying the error message when the bridge call rejects', (): void => {
    removeResponseMarbles = '--#';

    expectEffect('---d', {
      d: AiActions.aiRemovalFinished({key: 'model-a', outcome: {status: 'failed', message: 'unreachable'}})
    }, new Error('unreachable'));
    expect(getState).not.toHaveBeenCalled();
  });

  it('finishes with the removal outcome alone when re-reading the state fails', (): void => {
    stateResponseMarbles = '--#';

    expectEffect('-----d', {d: AiActions.aiRemovalFinished({key: 'model-a', outcome: removeOutcome})}, undefined,
      new Error('unreachable'));
    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith();
  });
});
