import {AiState} from '../ai.state';
import {ElectronAiState} from "../../../app/startup/ai-bridge.type";

export function overwriteAiState(state: AiState, electronAiState: ElectronAiState): AiState {
  return {
    ...state,
    ...electronAiState
  };
}
