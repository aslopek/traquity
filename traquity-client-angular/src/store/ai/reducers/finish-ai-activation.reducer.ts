import {AiActivateOutcome} from '../../../bridge/ai-bridge.type';
import {AiState} from '../ai.state';

export function finishAiActivation(state: AiState, key: string, outcome: AiActivateOutcome): AiState {
  const {[key]: _cleared, ...activationErrors} = state.activationErrors;
  // setting the active model is done by re-reading the config file via IPC bridge, which is why it's not done here
  return {
    ...state,
    activationErrors: outcome.status === 'failed' ? {...activationErrors, [key]: outcome.message} : activationErrors
  };
}
