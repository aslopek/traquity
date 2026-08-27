import {AiDownloadProgress, CatalogueEntry} from '../../../bridge/ai-bridge.type';
import {AiDownload, AiState} from '../ai.state';

export type ActiveAiDownload = {
  key: string
  description: string
  progress: AiDownloadProgress
};

export function getActiveAiDownloadSelector(
  state: Pick<AiState, 'catalogue' | 'download'>
): ActiveAiDownload | null {
  const download: AiDownload | null = state.download;
  if (download == null) {
    return null;
  }

  const entry: CatalogueEntry | undefined = state.catalogue.find(
    (candidate: CatalogueEntry): boolean => candidate.key === download.key
  );
  if (entry == null) {
    return null;
  }
  return {
    key: entry.key,
    description: entry.description,
    progress: download.progress
  } satisfies ActiveAiDownload;
}
