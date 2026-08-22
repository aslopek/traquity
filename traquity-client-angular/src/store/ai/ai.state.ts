import {CatalogueEntry, ModelEntry} from '../../app/startup/startup-bridge.type';

export type AiState = {
  isConfirmed: boolean
  catalogue: CatalogueEntry[]
  models: Record<string, ModelEntry>
};
