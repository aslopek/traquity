import {AiDownloadProgress} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';

const initialProgress: AiDownloadProgress = {
  phase: 'downloading',
  receivedBytes: 0,
  totalBytes: null,
  bytesPerSecond: 0,
  secondsRemaining: null
};

export function startAiDownload(state: AiState, key: string): AiState {
  const {[key]: _removed, ...downloadErrors} = state.downloadErrors;
  return {
    ...state,
    download: {key, progress: initialProgress},
    downloadErrors
  };
}
