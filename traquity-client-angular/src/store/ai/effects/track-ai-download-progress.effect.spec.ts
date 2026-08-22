import {beforeEach, describe, expect, it} from '@jest/globals';
import {Action} from '@ngrx/store';
import {Actions} from '@ngrx/effects';
import {EMPTY, Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {AiDownloadProgress} from '../../../app/startup/startup-bridge.type';
import {AppActions} from '../../app.actions';
import {AiActions} from '../ai.actions';
import {trackAiDownloadProgress, TrackAiDownloadProgressEffectArgs} from './track-ai-download-progress.effect';

type MockedAiBridgeService = {
  available: boolean
  downloadProgress$: Observable<AiDownloadProgress>
};

describe('trackAiDownloadProgress', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let progressMarbles: string;
  let progress: AiDownloadProgress;
  let aiBridgeService: MockedAiBridgeService;
  let effectArgs: Omit<TrackAiDownloadProgressEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): void {
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      aiBridgeService.downloadProgress$ = cold(progressMarbles, {p: progress});
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      expectObservable(trackAiDownloadProgress({actions$, ...effectArgs})).toBe(expectedMarbles, expectedValues);
    });
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    progressMarbles = '--p--p';
    progress = {phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1};

    actionValues = {
      a: AppActions.initialize()
    };

    aiBridgeService = {available: true, downloadProgress$: EMPTY};

    effectArgs = {aiBridgeService};
  });

  it('dispatches an action for every progress event pushed by the bridge', (): void => {
    expectEffect('---d--d', {d: AiActions.aiDownloadProgress({progress})});
  });

  it('emits nothing when the bridge is not available', (): void => {
    aiBridgeService.available = false;

    expectEffect('');
  });
});
