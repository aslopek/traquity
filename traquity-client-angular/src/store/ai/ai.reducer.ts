import {createReducer, on} from '@ngrx/store';
import {AiActions} from './ai.actions';
import {AiState} from './ai.state';
import {finishAiDownload} from './reducers/finish-ai-download.reducer';
import {overwriteAiState} from './reducers/overwrite-ai-state.reducer';
import {startAiDownload} from './reducers/start-ai-download.reducer';
import {updateAiDownloadProgress} from './reducers/update-ai-download-progress.reducer';

export const initialState: AiState = {
  isConfirmed: false,
  catalogue: [],
  models: {},
  download: null,
  downloadErrors: {}
} as const;

export const aiReducer = createReducer(
  initialState,

  on(AiActions.loadAiStateDone, (state, {electronAiState}) => overwriteAiState(state, electronAiState)),
  on(AiActions.downloadModel, (state, {key}) => startAiDownload(state, key)),
  on(AiActions.aiDownloadProgress, (state, {progress}) => updateAiDownloadProgress(state, progress)),
  on(AiActions.aiDownloadFinished, (state, {key, outcome}) => finishAiDownload(state, key, outcome))
);
