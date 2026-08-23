import {Actions, ofType} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {EMPTY, map, Observable, switchMap} from 'rxjs';
import {AiBridgeService} from '../../../bridge/ai-bridge.service';
import {AiDownloadProgress} from '../../../bridge/ai-bridge.type';
import {AppActions} from '../../app.actions';
import {AiActions} from '../ai.actions';

export type TrackAiDownloadProgressEffectArgs = {
  actions$: Actions
  aiBridgeService: Pick<AiBridgeService, 'available' | 'downloadProgress$'>
};

export function trackAiDownloadProgress(effectArgs: TrackAiDownloadProgressEffectArgs): Observable<Action> {
  const {actions$, aiBridgeService} = effectArgs;
  return actions$.pipe(
    ofType(AppActions.initialize),
    switchMap((): Observable<Action> => aiBridgeService.available
      ? aiBridgeService.downloadProgress$.pipe(
        map((progress: AiDownloadProgress): Action => AiActions.aiDownloadProgress({progress}))
      )
      : EMPTY)
  );
}
