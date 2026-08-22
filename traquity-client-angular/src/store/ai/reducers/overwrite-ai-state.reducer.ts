import {AiState} from '../ai.state';
import {ElectronAiState} from "../../../app/startup/startup-bridge.type";

/** Keeps `download` and `downloadErrors` as they were: `ElectronAiState` carries neither, both are this slice's own. */
export function overwriteAiState(state: AiState, electronAiState: ElectronAiState): AiState {
  return {
    ...state,
    ...electronAiState
  };
}
