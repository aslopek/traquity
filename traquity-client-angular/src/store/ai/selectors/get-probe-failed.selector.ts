import {AiState} from '../ai.state';

export function getProbeFailedSelector(state: Pick<AiState, 'probeFailed'>): boolean {
  return state.probeFailed;
}
