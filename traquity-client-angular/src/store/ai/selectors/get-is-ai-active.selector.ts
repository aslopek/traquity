import {ModelEntry} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';

/**
 * True if and only if the notice is confirmed and at least one installed model is marked active`.
 */
export function getIsAiActiveSelector(state: Pick<AiState, 'isConfirmed' | 'models'>): boolean {
  return state.isConfirmed && Object.values(state.models).some((model: ModelEntry): boolean => model.active);
}
