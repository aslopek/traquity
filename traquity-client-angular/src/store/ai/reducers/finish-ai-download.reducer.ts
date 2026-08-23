import {AiDownloadOutcome} from '../../../app/startup/ai-bridge.type';
import {AiState} from '../ai.state';

export function finishAiDownload(state: AiState, key: string, outcome: AiDownloadOutcome): AiState {
  return {
    ...state,
    download: null,
    downloadErrors: outcome.status === 'failed' ? {...state.downloadErrors, [key]: outcome.message} : state.downloadErrors
  };
}
