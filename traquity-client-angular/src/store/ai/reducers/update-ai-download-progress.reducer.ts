import {AiDownloadProgress} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';

/** A push event carries no key of its own - at most one download runs at a time, so `state.download`'s own key is what it belongs to. */
export function updateAiDownloadProgress(state: AiState, progress: AiDownloadProgress): AiState {
  return state.download == null ? state : {...state, download: {...state.download, progress}};
}
