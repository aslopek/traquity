import {createReducer, on} from '@ngrx/store';
import {AiActions} from './ai.actions';
import {AiState} from './ai.state';
import {overwriteAiState} from './reducers/overwrite-ai-state.reducer';

export const initialState: AiState = {
  isConfirmed: false,
  catalogue: [],
  models: {}
} as const;

export const aiReducer = createReducer(
  initialState,

  on(AiActions.loadAiStateDone, (state, {electronAiState}) => overwriteAiState(state, electronAiState))
);
