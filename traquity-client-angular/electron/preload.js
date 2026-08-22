const {contextBridge, ipcRenderer} = require('electron');

/** @import {AiState} from './ai/ai-registry.js' */
/** @import {AiDownloadProgress} from './ai/model-download.js' */
/** @import {BackendStartOutcome} from './backend/backend-process.js' */
/** @import {ConfigurationChanges} from './config/configuration-writer.js' */
/** @import {JavaDownloadProgress} from './java/corretto-download.js' */
/** @import {JavaVerification} from './java/java-version.js' */
/** @import {AiDownloadOutcome, AppliedConfiguration, ConfigureState, JavaDownloadOutcome, JavaPickResult} from './ipc/startup-bridge.js' */
/** @import {PickedDatabase} from './window/database-dialogs.js' */
/** @import {StartupState} from './window/startup-mode.js' */

// Channel names are literals here on purpose: a sandboxed preload's `require` is a limited polyfill that resolves
// `electron` and a handful of Node built-ins only - it cannot require a module of this app, so `ipc/` cannot be
// shared with it. All fourteen request/response literals plus the two one-way channels and the two push channels are
// duplicated in `ipc/startup-bridge.js`:
//   - `startup:getState`
//   - `backend:start`
//   - `auth:verify`
//   - `configure:getState`
//   - `database:pickExisting`
//   - `database:pickNew`
//   - `auth:forget`
//   - `config:apply`
//   - `java:verify`
//   - `java:pick`
//   - `java:download`
//   - `ai:getState`
//   - `ai:confirm`
//   - `ai:download`
//   - `java:downloadProgress` (push, main -> renderer)
//   - `ai:downloadProgress` (push, main -> renderer)
//   - `app:restartAndConfigure` (one-way)
//   - `app:quit` (one-way)
// The manual checklist (`electron/LLM.md`) is what keeps the two copies in step.
contextBridge.exposeInMainWorld('traquity', {
  /** @returns {Promise<StartupState>} */
  getStartupState: () => ipcRenderer.invoke('startup:getState'),

  /**
   * @param {string | undefined} [password]
   * @returns {Promise<BackendStartOutcome>}
   */
  startBackend: (password) => ipcRenderer.invoke('backend:start', password),

  /**
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  verifyPassword: (password) => ipcRenderer.invoke('auth:verify', password),

  /** @returns {Promise<ConfigureState>} */
  getConfigureState: () => ipcRenderer.invoke('configure:getState'),

  /**
   * @param {string | null} currentSelection
   * @returns {Promise<string | null>}
   */
  pickExistingDatabase: (currentSelection) => ipcRenderer.invoke('database:pickExisting', currentSelection),

  /**
   * @param {string | null} currentSelection
   * @returns {Promise<PickedDatabase | null>}
   */
  pickNewDatabase: (currentSelection) => ipcRenderer.invoke('database:pickNew', currentSelection),

  /**
   * @param {string} databasePath
   * @returns {Promise<void>}
   */
  forgetPassword: (databasePath) => ipcRenderer.invoke('auth:forget', databasePath),

  /**
   * @param {ConfigurationChanges} changes
   * @returns {Promise<AppliedConfiguration>}
   */
  applyConfiguration: (changes) => ipcRenderer.invoke('config:apply', changes),

  /**
   * @param {string | null} setting
   * @returns {Promise<JavaVerification>}
   */
  verifyJava: (setting) => ipcRenderer.invoke('java:verify', setting),

  /**
   * @param {string | null} currentSetting
   * @returns {Promise<JavaPickResult | null>}
   */
  pickJava: (currentSetting) => ipcRenderer.invoke('java:pick', currentSetting),

  /** @returns {Promise<JavaDownloadOutcome>} */
  downloadJava: () => ipcRenderer.invoke('java:download'),

  /** @returns {Promise<AiState>} */
  getAiState: () => ipcRenderer.invoke('ai:getState'),

  /** @returns {Promise<void>} */
  confirmAiNotice: () => ipcRenderer.invoke('ai:confirm'),

  /**
   * @param {string} key
   * @returns {Promise<AiDownloadOutcome>}
   */
  downloadModel: (key) => ipcRenderer.invoke('ai:download', key),

  /**
   * @param {(progress: JavaDownloadProgress) => void} listener
   * @returns {() => void} unsubscribes the listener
   */
  onJavaDownloadProgress: (listener) => {
    /** @param {unknown} _event @param {JavaDownloadProgress} progress */
    const wrapped = (_event, progress) => listener(progress);
    ipcRenderer.on('java:downloadProgress', wrapped);
    return () => ipcRenderer.removeListener('java:downloadProgress', wrapped);
  },

  /**
   * @param {(progress: AiDownloadProgress) => void} listener
   * @returns {() => void} unsubscribes the listener
   */
  onAiDownloadProgress: (listener) => {
    /** @param {unknown} _event @param {AiDownloadProgress} progress */
    const wrapped = (_event, progress) => listener(progress);
    ipcRenderer.on('ai:downloadProgress', wrapped);
    return () => ipcRenderer.removeListener('ai:downloadProgress', wrapped);
  },

  /** @returns {void} */
  restartAndConfigure: () => ipcRenderer.send('app:restartAndConfigure'),

  /** @returns {void} */
  quit: () => ipcRenderer.send('app:quit')
});
