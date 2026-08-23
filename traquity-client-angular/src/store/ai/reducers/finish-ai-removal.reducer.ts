import {AiRemoveOutcome} from '../../../app/startup/ai-bridge.type';
import {AiState} from '../ai.state';

export function finishAiRemoval(state: AiState, key: string, outcome: AiRemoveOutcome): AiState {
  const {[key]: _cleared, ...removalErrors} = state.removalErrors;
  return {
    ...state,
    removalErrors: outcome.status === 'failed' ? {...removalErrors, [key]: outcome.message} : removalErrors
  };
}
