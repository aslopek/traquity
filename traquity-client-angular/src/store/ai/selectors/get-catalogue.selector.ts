import {AiDownloadProgress, CatalogueEntry} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';

export type CatalogueEntryViewModel = CatalogueEntry & {
  installed: boolean
  /** True exactly for the one entry `state.download` names, if any. */
  downloading: boolean
  progress: AiDownloadProgress | null
  error: string | null
  /** False for an installed entry, and for a not-installed one while any download - its own or another entry's - is running. */
  showDownloadButton: boolean
};

export function getCatalogueSelector(state: Pick<AiState, 'catalogue' | 'models' | 'download' | 'downloadErrors'>): CatalogueEntryViewModel[] {
  const download = state.download;

  return state.catalogue.map((entry: CatalogueEntry): CatalogueEntryViewModel => {
    const installed: boolean = state.models[entry.key] !== undefined;
    return {
      ...entry,
      installed,
      downloading: download != null && download.key === entry.key,
      progress: download != null && download.key === entry.key ? download.progress : null,
      error: state.downloadErrors[entry.key] ?? null,
      showDownloadButton: !installed && download == null
    };
  });
}
