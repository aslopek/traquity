import {AiState} from '../ai.state';
import {ElectronAiState, ModelEntry} from "../../../bridge/ai-bridge.type";

function resolveActiveModel(models: Record<string, ModelEntry>): Record<string, ModelEntry> {
  const activeKeys: string[] = Object.entries(models).filter(([, model]) => model.active).map(([key]) => key);
  if (activeKeys.length <= 1) {
    return models;
  }

  const [keptKey] = activeKeys;
  return Object.fromEntries(
    Object.entries(models).map(([key, model]): [string, ModelEntry] => [key, {...model, active: key === keptKey}])
  );
}

export function overwriteAiState(state: AiState, electronAiState: ElectronAiState): AiState {
  return {
    ...state,
    ...electronAiState,
    models: resolveActiveModel(electronAiState.models)
  };
}
