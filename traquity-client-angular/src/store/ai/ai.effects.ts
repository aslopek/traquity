import {inject, Injectable} from '@angular/core';
import {Actions, createEffect} from '@ngrx/effects';
import {AiBridgeService} from '../../app/startup/ai-bridge.service';
import {confirmAiNotice, ConfirmAiNoticeEffectArgs} from './effects/confirm-ai-notice.effect';
import {downloadModel, DownloadModelEffectArgs} from './effects/download-model.effect';
import {loadAiState, LoadAiStateEffectArgs} from './effects/load-ai-state.effect';
import {trackAiDownloadProgress, TrackAiDownloadProgressEffectArgs} from './effects/track-ai-download-progress.effect';

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

  readonly downloadModel = createEffect(() => downloadModel({
    actions$: this.actions$,
    aiBridgeService: this.aiBridgeService
  } satisfies DownloadModelEffectArgs));

  readonly trackAiDownloadProgress = createEffect(() => trackAiDownloadProgress({
    actions$: this.actions$,
    aiBridgeService: this.aiBridgeService
  } satisfies TrackAiDownloadProgressEffectArgs));
}
