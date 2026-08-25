export type CatalogueEntry = {
  key: string
  description: string
  sizeBytes: number
  license: string
  requiredVram: number
};

export type ModelEntry = {
  path: string
  active: boolean
};

export type VerdictReason =
  | { kind: 'probeFailed' }
  | { kind: 'noGpuBackend' }
  | { kind: 'unrecognizedBackend' }
  | { kind: 'insufficientVram', requiredBytes: number, availableBytes: number };

export type ModelVerdict = {
  verdict: 'ok' | 'unsupported' | 'unknown'
  /** `null` if and only if `verdict` is `'ok'`. */
  reason: VerdictReason | null
};

/** Mirrors the main process's `AiGetStateResult`. */
export type ElectronAiState = {
  isConfirmed: boolean
  catalogue: CatalogueEntry[]
  models: Record<string, ModelEntry>
  verdicts: Record<string, ModelVerdict>
  probeFailed: boolean
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

/** There is no cancellation step for an activation, unlike a download, so only these two outcomes exist. */
export type AiActivateOutcome =
  | { status: 'activated' }
  | { status: 'failed', message: string };

export type TraQuityAiBridge = {
  getAiState: () => Promise<ElectronAiState>
  confirmAiNotice: () => Promise<void>
  downloadModel: (key: string) => Promise<AiDownloadOutcome>
  removeModel: (key: string) => Promise<AiRemoveOutcome>
  activateModel: (key: string) => Promise<AiActivateOutcome>
  onAiDownloadProgress: (listener: (progress: AiDownloadProgress) => void) => () => void
};
