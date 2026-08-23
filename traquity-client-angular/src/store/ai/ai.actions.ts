import {createActionGroup, emptyProps, props} from '@ngrx/store';
import {AiDownloadOutcome, AiDownloadProgress, AiRemoveOutcome, ElectronAiState} from "../../app/startup/ai-bridge.type";

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

export const AiActions = createActionGroup({
  source: 'Ai',
  events: {
    'Load Ai State Done': props<LoadAiStateDoneActionArgs>(),
    'Confirm Ai Notice': emptyProps(),
    'Download Model': props<DownloadModelActionArgs>(),
    'Ai Download Progress': props<AiDownloadProgressActionArgs>(),
    'Ai Download Finished': props<AiDownloadFinishedActionArgs>(),
    'Remove Model': props<RemoveModelActionArgs>(),
    'Ai Removal Finished': props<AiRemovalFinishedActionArgs>()
  }
});
