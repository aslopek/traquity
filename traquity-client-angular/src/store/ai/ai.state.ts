import {AiDownloadProgress, CatalogueEntry, ModelEntry, ModelVerdict} from '../../bridge/ai-bridge.type';

export type AiDownload = {
  key: string
  progress: AiDownloadProgress
};

export type AiState = {
  isConfirmed: boolean
  catalogue: CatalogueEntry[]
  models: Record<string, ModelEntry>
  /** Keyed by catalogue key; carries every catalogued entry once the bridge has reported state at least once. */
  verdicts: Record<string, ModelVerdict>
  /** Whether the most recently reported machine capability probe itself failed. */
  probeFailed: boolean
  /** Non-null for as long as a download is running - at most one at a time, whatever catalogue entry it is for. */
  download: AiDownload | null
  /** Keyed by catalogue key; an entry is cleared the moment a new download starts for that same key. */
  downloadErrors: Record<string, string>
  /** Keyed by catalogue key; an entry is replaced or cleared once a further removal attempt for that same key finishes. */
  removalErrors: Record<string, string>
  /** Keyed by catalogue key; an entry is replaced or cleared once a further activation attempt for that same key finishes. */
  activationErrors: Record<string, string>
};
