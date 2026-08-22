import {AiDownloadProgress, CatalogueEntry, ModelEntry} from '../../app/startup/startup-bridge.type';

export type AiDownload = {
  key: string
  progress: AiDownloadProgress
};

export type AiState = {
  isConfirmed: boolean
  catalogue: CatalogueEntry[]
  models: Record<string, ModelEntry>
  /** Non-null for as long as a download is running - at most one at a time, whatever catalogue entry it is for. */
  download: AiDownload | null
  /** Keyed by catalogue key; an entry is cleared the moment a new download starts for that same key. */
  downloadErrors: Record<string, string>
};
