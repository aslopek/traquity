import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, concat, EMPTY, exhaustMap, map, Observable, of, switchMap} from 'rxjs';
import {AiBridgeService} from '../../../bridge/ai-bridge.service';
import {AiDownloadOutcome, ElectronAiState} from '../../../bridge/ai-bridge.type';
import {AiActions} from '../ai.actions';

export type DownloadModelEffectArgs = {
  actions$: Actions
  aiBridgeService: Pick<AiBridgeService, 'downloadModel' | 'getState'>
};

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
