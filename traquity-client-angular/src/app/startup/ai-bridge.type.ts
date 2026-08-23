export type CatalogueEntry = {
  key: string
  description: string
  sizeBytes: number
  license: string
};

export type ModelEntry = {
  path: string
  active: boolean
};

/** Mirrors the main process's `AiState`. */
export type ElectronAiState = {
  isConfirmed: boolean
  catalogue: CatalogueEntry[]
  models: Record<string, ModelEntry>
};

export type AiDownloadPhase = 'downloading' | 'verifying' | 'installing';

export type AiDownloadProgress = {
  phase: AiDownloadPhase
  receivedBytes: number
  totalBytes: number | null
  bytesPerSecond: number
  secondsRemaining: number | null
};

/**
 * `cancelled` is a status separate from `failed`: dismissing the directory picker without choosing
 * anything is not an error. A `completed` outcome carries no path - the model this installed is read back through
 * `getAiState`.
 */
export type AiDownloadOutcome =
  | { status: 'completed' }
  | { status: 'cancelled' }
  | { status: 'failed', message: string };

/** There is no cancellation step for a removal, unlike a download, so only these two outcomes exist. */
export type AiRemoveOutcome =
  | { status: 'removed' }
  | { status: 'failed', message: string };

export type TraQuityAiBridge = {
  getAiState: () => Promise<ElectronAiState>
  confirmAiNotice: () => Promise<void>
  downloadModel: (key: string) => Promise<AiDownloadOutcome>
  removeModel: (key: string) => Promise<AiRemoveOutcome>
  onAiDownloadProgress: (listener: (progress: AiDownloadProgress) => void) => () => void
};
