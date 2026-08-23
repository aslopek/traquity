import {ModelEntry} from '../../../bridge/ai-bridge.type';
import {AiState} from '../ai.state';

export type ActiveModel = {
  key: string
  path: string
};

export function getActiveModelSelector(state: Pick<AiState, 'models'>): ActiveModel | null {
  const activeEntry: [string, ModelEntry] | undefined = Object.entries(state.models).find(([, model]) => model.active);
  return activeEntry == null ? null : {key: activeEntry[0], path: activeEntry[1].path} satisfies ActiveModel;
}
