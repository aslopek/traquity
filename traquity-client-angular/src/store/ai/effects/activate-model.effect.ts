import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, concat, EMPTY, exhaustMap, map, Observable, of, switchMap} from 'rxjs';
import {AiBridgeService} from '../../../bridge/ai-bridge.service';
import {AiActivateOutcome, ElectronAiState} from '../../../bridge/ai-bridge.type';
import {AiActions} from '../ai.actions';

export type ActivateModelEffectArgs = {
  actions$: Actions
  aiBridgeService: Pick<AiBridgeService, 'activateModel' | 'getState'>
};

export function activateModel(effectArgs: ActivateModelEffectArgs): Observable<Action> {
  const {actions$, aiBridgeService} = effectArgs;
  return actions$.pipe(
    ofType(AiActions.activateModel),
    exhaustMap(({key}): Observable<Action> => aiBridgeService.activateModel(key).pipe(
      switchMap((outcome: AiActivateOutcome): Observable<Action> => outcome.status === 'activated'
        ? concat(
          aiBridgeService.getState().pipe(
            map((electronAiState: ElectronAiState): Action => AiActions.loadAiStateDone({electronAiState})),
            catchError(() => EMPTY)
          ),
          of(AiActions.aiActivationFinished({key, outcome}))
        )
        : of(AiActions.aiActivationFinished({key, outcome}))),
      catchError((error: unknown): Observable<Action> => of(AiActions.aiActivationFinished({
        key,
        outcome: {status: 'failed', message: error instanceof Error ? error.message : String(error)}
      })))
    ))
  );
}
