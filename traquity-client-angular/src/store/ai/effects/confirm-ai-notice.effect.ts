import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, EMPTY, map, Observable, switchMap} from 'rxjs';
import {AiBridgeService} from '../../../app/startup/ai-bridge.service';
import {ElectronAiState} from '../../../app/startup/startup-bridge.type';
import {AiActions} from '../ai.actions';

export type ConfirmAiNoticeEffectArgs = {
  actions$: Actions
  aiBridgeService: Pick<AiBridgeService, 'confirmNotice' | 'getState'>
};

export function confirmAiNotice(effectArgs: ConfirmAiNoticeEffectArgs): Observable<Action> {
  const {actions$, aiBridgeService} = effectArgs;
  return actions$.pipe(
    ofType(AiActions.confirmAiNotice),
    switchMap((): Observable<Action> => aiBridgeService.confirmNotice().pipe(
      switchMap((): Observable<ElectronAiState> => aiBridgeService.getState()),
      map((electronAiState: ElectronAiState): Action => AiActions.loadAiStateDone({electronAiState})),
      catchError(() => EMPTY)
    ))
  );
}
