import {inject, Injectable} from '@angular/core';
import {Actions, createEffect} from '@ngrx/effects';
import {AiBridgeService} from '../../app/startup/ai-bridge.service';
import {confirmAiNotice, ConfirmAiNoticeEffectArgs} from './effects/confirm-ai-notice.effect';
import {loadAiState, LoadAiStateEffectArgs} from './effects/load-ai-state.effect';

@Injectable()
export class AiEffects {

  private readonly actions$: Actions = inject(Actions);
  private readonly aiBridgeService: AiBridgeService = inject(AiBridgeService);

  readonly loadAiState = createEffect(() => loadAiState({
    actions$: this.actions$,
    aiBridgeService: this.aiBridgeService
  } satisfies LoadAiStateEffectArgs));

  readonly confirmAiNotice = createEffect(() => confirmAiNotice({
    actions$: this.actions$,
    aiBridgeService: this.aiBridgeService
  } satisfies ConfirmAiNoticeEffectArgs));
}
