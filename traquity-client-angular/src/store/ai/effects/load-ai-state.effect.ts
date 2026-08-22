import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {catchError, EMPTY, map, Observable, switchMap} from 'rxjs';
import {AiBridgeService} from '../../../app/startup/ai-bridge.service';
import {ElectronAiState} from '../../../app/startup/startup-bridge.type';
import {AppActions} from '../../app.actions';
import {AiActions} from '../ai.actions';

export type LoadAiStateEffectArgs = {
  actions$: Actions
  aiBridgeService: Pick<AiBridgeService, 'available' | 'getState'>
};

export function loadAiState(effectArgs: LoadAiStateEffectArgs): Observable<Action> {
  const {actions$, aiBridgeService} = effectArgs;
  return actions$.pipe(
    ofType(AppActions.initialize),
    switchMap((): Observable<Action> => aiBridgeService.available
      ? aiBridgeService.getState().pipe(
        map((electronAiState: ElectronAiState): Action => AiActions.loadAiStateDone({electronAiState})),
        catchError(() => EMPTY)
      )
      : EMPTY)
  );
}
