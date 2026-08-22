import {AiDownloadOutcome} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';

/**
 * Clears the in-progress download for `key`, whatever `outcome` turned out to be. A `failed` outcome additionally
 * records its message for that key; `cancelled` and `completed` leave `downloadErrors` as `startAiDownload` already
 * cleared it.
 */
export function finishAiDownload(state: AiState, key: string, outcome: AiDownloadOutcome): AiState {
  return {
    ...state,
    download: null,
    downloadErrors: outcome.status === 'failed' ? {...state.downloadErrors, [key]: outcome.message} : state.downloadErrors
  };
}
