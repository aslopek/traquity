import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, concat, EMPTY, exhaustMap, map, Observable, of, switchMap} from 'rxjs';
import {AiBridgeService} from '../../../app/startup/ai-bridge.service';
import {AiRemoveOutcome, ElectronAiState} from '../../../app/startup/ai-bridge.type';
import {AiActions} from '../ai.actions';

export type RemoveModelEffectArgs = {
  actions$: Actions
  aiBridgeService: Pick<AiBridgeService, 'removeModel' | 'getState'>
};

export function removeModel(effectArgs: RemoveModelEffectArgs): Observable<Action> {
  const {actions$, aiBridgeService} = effectArgs;
  return actions$.pipe(
    ofType(AiActions.removeModel),
    exhaustMap(({key}): Observable<Action> => aiBridgeService.removeModel(key).pipe(
      switchMap((outcome: AiRemoveOutcome): Observable<Action> => outcome.status === 'removed'
        ? concat(
          aiBridgeService.getState().pipe(
            map((electronAiState: ElectronAiState): Action => AiActions.loadAiStateDone({electronAiState})),
            catchError(() => EMPTY)
          ),
          of(AiActions.aiRemovalFinished({key, outcome}))
        )
        : of(AiActions.aiRemovalFinished({key, outcome}))),
      catchError((error: unknown): Observable<Action> => of(AiActions.aiRemovalFinished({
        key,
        outcome: {status: 'failed', message: error instanceof Error ? error.message : String(error)}
      })))
    ))
  );
}
