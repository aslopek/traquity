import {createActionGroup, emptyProps, props} from '@ngrx/store';
import {AiActivateOutcome, AiDownloadOutcome, AiDownloadProgress, AiRemoveOutcome, ElectronAiState} from "../../bridge/ai-bridge.type";

export type LoadAiStateDoneActionArgs = {
  electronAiState: ElectronAiState
};

export type DownloadModelActionArgs = {
  key: string
};

export type AiDownloadProgressActionArgs = {
  progress: AiDownloadProgress
};

export type AiDownloadFinishedActionArgs = {
  key: string
  outcome: AiDownloadOutcome
};

export type RemoveModelActionArgs = {
  key: string
};

export type AiRemovalFinishedActionArgs = {
  key: string
  outcome: AiRemoveOutcome
};

export type ActivateModelActionArgs = {
  key: string
};

export type AiActivationFinishedActionArgs = {
  key: string
  outcome: AiActivateOutcome
};

export const AiActions = createActionGroup({
  source: 'Ai',
  events: {
    'Load Ai State Done': props<LoadAiStateDoneActionArgs>(),
    'Confirm Ai Notice': emptyProps(),
    'Download Model': props<DownloadModelActionArgs>(),
    'Ai Download Progress': props<AiDownloadProgressActionArgs>(),
    'Ai Download Finished': props<AiDownloadFinishedActionArgs>(),
    'Remove Model': props<RemoveModelActionArgs>(),
    'Ai Removal Finished': props<AiRemovalFinishedActionArgs>(),
    'Activate Model': props<ActivateModelActionArgs>(),
    'Ai Activation Finished': props<AiActivationFinishedActionArgs>()
  }
});
