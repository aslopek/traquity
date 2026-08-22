import {AiState} from '../ai.state';
import {ElectronAiState} from "../../../app/startup/startup-bridge.type";

export function overwriteAiState(_state: AiState, electronAiState: ElectronAiState): AiState {
  return {
    ...electronAiState
  };
}
