import {CatalogueEntry} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';

export type CatalogueEntryViewModel = CatalogueEntry & {
  installed: boolean
};

export function getCatalogueSelector(state: Pick<AiState, 'catalogue' | 'models'>): CatalogueEntryViewModel[] {
  return state.catalogue.map((entry: CatalogueEntry): CatalogueEntryViewModel => ({
    ...entry,
    installed: state.models[entry.key] !== undefined,
  }));
}
