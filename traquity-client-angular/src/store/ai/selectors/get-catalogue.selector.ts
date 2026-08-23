import {AiDownloadProgress, CatalogueEntry} from '../../../app/startup/ai-bridge.type';
import {AiDownload, AiState} from '../ai.state';

export type CatalogueEntryViewModel = CatalogueEntry & {
  installed: boolean
  /** True exactly for the one entry `state.download` names, if any. */
  downloading: boolean
  progress: AiDownloadProgress | null
  error: string | null
  /** False for an installed entry, and for a not-installed one while any download - its own or another entry's - is running. */
  showDownloadButton: boolean
  /** True exactly when the most recent removal attempt for this entry failed. */
  removalFailed: boolean
};

export function getCatalogueSelector(
  state: Pick<AiState, 'catalogue' | 'models' | 'download' | 'downloadErrors' | 'removalErrors'>
): CatalogueEntryViewModel[] {
  const download: AiDownload | null = state.download;

  return state.catalogue.map((entry: CatalogueEntry): CatalogueEntryViewModel => {
    const installed: boolean = state.models[entry.key] !== undefined;
    return {
      ...entry,
      installed,
      downloading: download != null && download.key === entry.key,
      progress: download != null && download.key === entry.key ? download.progress : null,
      error: state.downloadErrors[entry.key] ?? null,
      showDownloadButton: !installed && download == null,
      removalFailed: state.removalErrors[entry.key] != null
    };
  });
}
