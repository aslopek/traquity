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

/** What the extraction request carries. Mirrors the main process's `aiExtractionRequestSchema`. */
export type AiExtractionRequest = {
  /** The page as the extractor rendered it: one line per printed row. */
  document: string
  /** Three upper-case letters. Amounts denoted in any other currency are not extracted. */
  currency: string
  /** A catalogue key, which also picks the model-specific system prompt layer. */
  modelKey: string
};

/**
 * The keys of `TransactionCreate` a document can state, plus the security's ISIN. `securityId` is resolved from
 * that ISIN here, and `securityCountSplitAdjusted` is derived from stock splits no document prints.
 */
export type ExtractedTransaction = {
  transactionType: 'BUY' | 'SELL' | 'DIVIDEND' | 'TAX'
  /** `yyyy-MM-dd`. */
  date: string
  /** `HH:mm:ss`. */
  time?: string
  isin?: string
  securityCountOriginal: number
  grossValue: number
  /** The document's tax lines, summed. */
  tax?: number
  /** The document's fee lines, summed. */
  fee?: number
};

/** There is no cancellation for an extraction, so only these two outcomes exist. */
export type AiExtractionOutcome =
  | { status: 'extracted', transaction: ExtractedTransaction }
  | { status: 'failed', message: string };

export type TraQuityAiBridge = {
  getAiState: () => Promise<ElectronAiState>
  confirmAiNotice: () => Promise<void>
  downloadModel: (key: string) => Promise<AiDownloadOutcome>
  extractTransaction: (request: AiExtractionRequest) => Promise<AiExtractionOutcome>
  removeModel: (key: string) => Promise<AiRemoveOutcome>
  activateModel: (key: string) => Promise<AiActivateOutcome>
  onAiDownloadProgress: (listener: (progress: AiDownloadProgress) => void) => () => void
};
