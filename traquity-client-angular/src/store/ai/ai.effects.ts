import {inject, Injectable} from '@angular/core';
import {Actions, createEffect} from '@ngrx/effects';
import {AiBridgeService} from '../../bridge/ai-bridge.service';
import {activateModel, ActivateModelEffectArgs} from './effects/activate-model.effect';
import {confirmAiNotice, ConfirmAiNoticeEffectArgs} from './effects/confirm-ai-notice.effect';
import {downloadModel, DownloadModelEffectArgs} from './effects/download-model.effect';
import {loadAiState, LoadAiStateEffectArgs} from './effects/load-ai-state.effect';
import {removeModel, RemoveModelEffectArgs} from './effects/remove-model.effect';
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

  readonly removeModel = createEffect(() => removeModel({
    actions$: this.actions$,
    aiBridgeService: this.aiBridgeService
  } satisfies RemoveModelEffectArgs));

  readonly activateModel = createEffect(() => activateModel({
    actions$: this.actions$,
    aiBridgeService: this.aiBridgeService
  } satisfies ActivateModelEffectArgs));
}
