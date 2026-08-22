import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Action} from '@ngrx/store';
import {Actions} from '@ngrx/effects';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {AiBridgeService} from '../../../app/startup/ai-bridge.service';
import {AiDownloadOutcome, ElectronAiState} from '../../../app/startup/startup-bridge.type';
import {AiActions} from '../ai.actions';
import {downloadModel, DownloadModelEffectArgs} from './download-model.effect';

type MockedAiBridgeService = Pick<AiBridgeService, 'downloadModel' | 'getState'>;

describe('downloadModel', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let downloadResponseMarbles: string;
  let stateResponseMarbles: string;
  let downloadOutcome: AiDownloadOutcome;
  let electronAiState: ElectronAiState;
  let downloadModelMock: jest.Mock<(key: string) => Observable<AiDownloadOutcome>>;
  let getState: jest.Mock<() => Observable<ElectronAiState>>;
  let aiBridgeService: MockedAiBridgeService;
  let effectArgs: Omit<DownloadModelEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>, downloadError?: unknown,
                        stateError?: unknown): void {
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      downloadModelMock.mockReturnValue(cold(downloadResponseMarbles, {o: downloadOutcome}, downloadError));
      getState.mockReturnValue(cold(stateResponseMarbles, {v: electronAiState}, stateError));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      expectObservable(downloadModel({actions$, ...effectArgs})).toBe(expectedMarbles, expectedValues);
    });
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    downloadResponseMarbles = '--(o|)';
    stateResponseMarbles = '--(v|)';
    downloadOutcome = {status: 'completed'};
    electronAiState = {isConfirmed: true, catalogue: [], models: {}};

    actionValues = {
      a: AiActions.downloadModel({key: 'model-a'})
    };

    downloadModelMock = jest.fn<(key: string) => Observable<AiDownloadOutcome>>();
    getState = jest.fn<() => Observable<ElectronAiState>>();
    aiBridgeService = {downloadModel: downloadModelMock, getState};

    effectArgs = {aiBridgeService};
  });

  it('downloads the requested model with its key', (): void => {
    expectEffect('-----(ed)', {
      e: AiActions.loadAiStateDone({electronAiState}),
      d: AiActions.aiDownloadFinished({key: 'model-a', outcome: downloadOutcome})
    });
    expect(downloadModelMock).toHaveBeenCalledTimes(1);
    expect(downloadModelMock).toHaveBeenCalledWith('model-a');
  });

  it('re-reads the ai state through the bridge, and only clears the in-progress download once that finishes', (): void => {
    expectEffect('-----(ed)', {
      e: AiActions.loadAiStateDone({electronAiState}),
      d: AiActions.aiDownloadFinished({key: 'model-a', outcome: downloadOutcome})
    });
    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith();
  });

  it('finishes on a cancelled outcome without re-reading the state', (): void => {
    downloadOutcome = {status: 'cancelled'};

    expectEffect('---d', {d: AiActions.aiDownloadFinished({key: 'model-a', outcome: downloadOutcome})});
    expect(getState).not.toHaveBeenCalled();
  });

  it('finishes on a failed outcome without re-reading the state', (): void => {
    downloadOutcome = {status: 'failed', message: 'Not enough free disk space in the selected folder'};

    expectEffect('---d', {d: AiActions.aiDownloadFinished({key: 'model-a', outcome: downloadOutcome})});
    expect(getState).not.toHaveBeenCalled();
  });

  it('finishes with a failed outcome carrying the error message when the bridge call rejects', (): void => {
    downloadResponseMarbles = '--#';

    expectEffect('---d', {
      d: AiActions.aiDownloadFinished({key: 'model-a', outcome: {status: 'failed', message: 'unreachable'}})
    }, new Error('unreachable'));
    expect(getState).not.toHaveBeenCalled();
  });

  it('finishes with the download outcome alone when re-reading the state fails', (): void => {
    stateResponseMarbles = '--#';

    expectEffect('-----d', {d: AiActions.aiDownloadFinished({key: 'model-a', outcome: downloadOutcome})}, undefined,
      new Error('unreachable'));
  });
});
