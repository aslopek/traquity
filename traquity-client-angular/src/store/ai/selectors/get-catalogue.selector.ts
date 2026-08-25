import {AiDownloadProgress, CatalogueEntry, ModelVerdict} from '../../../bridge/ai-bridge.type';
import {AiDownload, AiState} from '../ai.state';
import {getActiveModelSelector} from './get-active-model.selector';

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
  /** True exactly for the currently active model. */
  active: boolean
  /** True exactly when the most recent activation attempt for this entry failed. */
  activationFailed: boolean
  /** Undefined only before the bridge has ever reported state; a verdict never gates download or activation. */
  verdict: ModelVerdict | undefined
};

export function getCatalogueSelector(
  state: Pick<AiState, 'catalogue' | 'models' | 'download' | 'downloadErrors' | 'removalErrors' | 'activationErrors' | 'verdicts'>
): CatalogueEntryViewModel[] {
  const download: AiDownload | null = state.download;
  const activeKey: string | null = getActiveModelSelector(state)?.key ?? null;

  return state.catalogue.map((entry: CatalogueEntry): CatalogueEntryViewModel => {
    const installed: boolean = state.models[entry.key] !== undefined;
    return {
      ...entry,
      installed,
      downloading: download != null && download.key === entry.key,
      progress: download != null && download.key === entry.key ? download.progress : null,
      error: state.downloadErrors[entry.key] ?? null,
      showDownloadButton: !installed && download == null,
      removalFailed: state.removalErrors[entry.key] != null,
      active: entry.key === activeKey,
      activationFailed: state.activationErrors[entry.key] != null,
      verdict: state.verdicts[entry.key]
    };
  });
}
