import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Action} from '@ngrx/store';
import {Actions} from '@ngrx/effects';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {AiBridgeService} from '../../../app/startup/ai-bridge.service';
import {ElectronAiState} from '../../../app/startup/startup-bridge.type';
import {AiActions} from '../ai.actions';
import {confirmAiNotice, ConfirmAiNoticeEffectArgs} from './confirm-ai-notice.effect';

type MockedAiBridgeService = Pick<AiBridgeService, 'confirmNotice' | 'getState'>;

describe('confirmAiNotice', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let confirmResponseMarbles: string;
  let stateResponseMarbles: string;
  let electronAiState: ElectronAiState;
  let confirmNotice: jest.Mock<() => Observable<void>>;
  let getState: jest.Mock<() => Observable<ElectronAiState>>;
  let aiBridgeService: MockedAiBridgeService;
  let effectArgs: Omit<ConfirmAiNoticeEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): void {
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      confirmNotice.mockReturnValue(cold(confirmResponseMarbles, {c: undefined}));
      getState.mockReturnValue(cold(stateResponseMarbles, {v: electronAiState}));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      expectObservable(confirmAiNotice({actions$, ...effectArgs})).toBe(expectedMarbles, expectedValues);
    });
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    confirmResponseMarbles = '--(c|)';
    stateResponseMarbles = '--(v|)';
    electronAiState = {isConfirmed: true, catalogue: [], models: {}};

    actionValues = {
      a: AiActions.confirmAiNotice()
    };

    confirmNotice = jest.fn<() => Observable<void>>();
    getState = jest.fn<() => Observable<ElectronAiState>>();
    aiBridgeService = {confirmNotice, getState};

    effectArgs = {aiBridgeService};
  });

  it('confirms the notice and re-reads the state through the bridge', (): void => {
    expectEffect('-----d', {d: AiActions.loadAiStateDone({electronAiState})});
    expect(confirmNotice).toHaveBeenCalledTimes(1);
    expect(confirmNotice).toHaveBeenCalledWith();
    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith();
  });

  it('emits nothing when confirming fails', (): void => {
    confirmResponseMarbles = '--#';

    expectEffect('');
    expect(getState).not.toHaveBeenCalled();
  });

  it('emits nothing when re-reading the state fails', (): void => {
    stateResponseMarbles = '--#';

    expectEffect('');
  });
});
