import {AiDownloadProgress} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';

export function updateAiDownloadProgress(state: AiState, progress: AiDownloadProgress): AiState {
  return state.download == null ? state : {...state, download: {...state.download, progress}};
}
