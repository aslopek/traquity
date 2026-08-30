import {ModelEntry} from '../../../bridge/ai-bridge.type';
import {AiState} from '../ai.state';

/**
 * True if and only if the notice is confirmed, the machine capability probe answered, and at least one installed
 * model is marked active. A failed probe indicates something went wrong when invoking the hardware capabilities,
 * so successfully running prompts appears unlikely.
 */
export function getIsAiActiveSelector(state: Pick<AiState, 'isConfirmed' | 'models' | 'probeFailed'>): boolean {
  return state.isConfirmed
    && !state.probeFailed
    && Object.values(state.models).some((model: ModelEntry): boolean => model.active);
}
