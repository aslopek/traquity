import {AiState} from '../ai.state';

export function getIsNoticeConfirmedSelector(state: Pick<AiState, 'isConfirmed'>): boolean {
  return state.isConfirmed;
}
