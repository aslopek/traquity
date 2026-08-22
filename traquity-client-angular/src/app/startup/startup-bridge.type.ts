export type StartupMode = 'boot' | 'configure' | 'insecure' | 'unlock';
export type AuthState = 'passwordless' | 'pending' | 'scrypt';

export type StartupState = {
  authState: AuthState | null
  databasePath: string | null
  mode: StartupMode
};

export type BackendStartOutcome = {
  reachable: boolean
  startedFrom: AuthState
};

/**
 * 'pending' is the only  AuthState where the app does not know anything about the database.
 */
export type KnownAuthState = Exclude<AuthState, 'pending'>;

export type KnownDatabase = {
  path: string
  authState: KnownAuthState
};

/** Mirrors the main process's `ConfigFileState` */
export type ConfigFileState = 'read' | 'missing' | 'unreadable';

export type ConfigureState = {
  configFileState: ConfigFileState
  knownDatabases: KnownDatabase[]
  logPath: string
  java: { path: string | null, signature: string | null }
};

export type PickedDatabase = {
  basePath: string
  fileExists: boolean
};

export type ConfigurationChanges = {
  databasePath: string
  javaPath: string | null
  javaSignature: string | null
};

export type JavaVerification =
  | { status: 'ok', javaPath: string, versionOutput: string }
  | { status: 'error', message: string };

export type JavaPickResult = {
  setting: string
  verification: JavaVerification
};

export type JavaDownloadPhase = 'downloading' | 'verifying' | 'extracting';

export type JavaDownloadProgress = {
  phase: JavaDownloadPhase
  receivedBytes: number
  totalBytes: number | null
  bytesPerSecond: number
  secondsRemaining: number | null
};

/**
 * A completed download carries the `-version` run that proved the extracted binary runs, so adopting it as the
 * current setting costs no second run and reports the banner that runtime actually printed.
 */
export type JavaDownloadOutcome =
  | { status: 'completed', javaPath: string, signature: string, verification: JavaVerification }
  | { status: 'failed', message: string };

/**
 * `authState` stays the full `AuthState`: `config:apply` reports the state of whatever database was just selected,
 * and a freshly created one is legitimately `pending`. The narrowing belongs to `KnownDatabase` alone.
 */
export type AppliedConfiguration = {
  databasePath: string
  authState: AuthState
};

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

export type TraQuityBridge = {
  getStartupState: () => Promise<StartupState>
  startBackend: (password: string) => Promise<BackendStartOutcome>
  verifyPassword: (password: string) => Promise<boolean>
  getConfigureState: () => Promise<ConfigureState>
  pickExistingDatabase: (currentSelection: string | null) => Promise<string | null>
  pickNewDatabase: (currentSelection: string | null) => Promise<PickedDatabase | null>
  forgetPassword: (databasePath: string) => Promise<void>
  applyConfiguration: (changes: ConfigurationChanges) => Promise<AppliedConfiguration>
  verifyJava: (setting: string | null) => Promise<JavaVerification>
  pickJava: (currentSetting: string | null) => Promise<JavaPickResult | null>
  downloadJava: () => Promise<JavaDownloadOutcome>
  getAiState: () => Promise<ElectronAiState>
  confirmAiNotice: () => Promise<void>
  onJavaDownloadProgress: (listener: (progress: JavaDownloadProgress) => void) => () => void
  restartAndConfigure: () => void
  quit: () => void
};
