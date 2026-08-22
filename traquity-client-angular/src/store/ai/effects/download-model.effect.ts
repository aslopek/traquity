import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, concat, EMPTY, exhaustMap, map, Observable, of, switchMap} from 'rxjs';
import {AiBridgeService} from '../../../app/startup/ai-bridge.service';
import {AiDownloadOutcome, ElectronAiState} from '../../../app/startup/startup-bridge.type';
import {AiActions} from '../ai.actions';

export type DownloadModelEffectArgs = {
  actions$: Actions
  aiBridgeService: Pick<AiBridgeService, 'downloadModel' | 'getState'>
};

/**
 * Downloads the requested model. A completed download re-reads the ai state through the bridge before `Ai Download
 * Finished` clears the in-progress download, so the slice ends up holding the newly installed model's own path
 * rather than something derived from the action - and so the progress indicator stays up through that re-read
 * rather than dropping out while it is still pending. A cancelled or failed outcome only clears the in-progress
 * download, which the reducer does off `Ai Download Finished` alone.
 */
export function downloadModel(effectArgs: DownloadModelEffectArgs): Observable<Action> {
  const {actions$, aiBridgeService} = effectArgs;
  return actions$.pipe(
    ofType(AiActions.downloadModel),
    exhaustMap(({key}): Observable<Action> => aiBridgeService.downloadModel(key).pipe(
      switchMap((outcome: AiDownloadOutcome): Observable<Action> => outcome.status === 'completed'
        ? concat(
          aiBridgeService.getState().pipe(
            map((electronAiState: ElectronAiState): Action => AiActions.loadAiStateDone({electronAiState})),
            catchError(() => EMPTY)
          ),
          of(AiActions.aiDownloadFinished({key, outcome}))
        )
        : of(AiActions.aiDownloadFinished({key, outcome}))),
      catchError((error: unknown): Observable<Action> => of(AiActions.aiDownloadFinished({
        key,
        outcome: {status: 'failed', message: error instanceof Error ? error.message : String(error)}
      })))
    ))
  );
}
