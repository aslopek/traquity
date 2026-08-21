const {
  authVerifyPasswordSchema,
  backendStartPasswordSchema,
  configurationChangesSchema,
  databasePathSchema,
  databaseSelectionSchema,
  javaSettingSchema
} = require('./ipc-schema.js');

/** @import {AiRegistry, AiState} from '../ai/ai-registry.js' */
/** @import {AuthRegistry, KnownDatabase} from '../config/auth-registry.js' */
/** @import {AuthState} from '../config/auth.js' */
/** @import {BackendProcess, BackendStartOutcome} from '../backend/backend-process.js' */
/** @import {ConfigFileState} from '../config/config-file.js' */
/** @import {ConfigurationWriter} from '../config/configuration-writer.js' */
/** @import {DatabaseDialogs} from '../window/database-dialogs.js' */
/** @import {TraQuityConfig} from '../config/config-schema.js' */
/** @import {JavaDownloadProgress, JavaDownloadResult} from '../java/corretto-download.js' */
/** @import {JavaDialogs} from '../window/java-dialogs.js' */
/** @import {JavaRuntime} from '../java/java-runtime.js' */
/** @import {JavaVerification} from '../java/java-version.js' */
/** @import {RestartIntoConfiguration} from '../app/restart-into-configuration.js' */
/** @import {StartupState} from '../window/startup-mode.js' */

/**
 * Registers the IPC channels the preload's `contextBridge` surface calls into. No generic `invoke(channel, ...)`
 * passthrough, ever - a wider surface would let the renderer reach into the main process in uncontrolled manner. All
 * but two are request/response (registered via `ipcMain.handle`); `app:restartAndConfigure` and `app:quit` are
 * one-way (`ipcMain.on`) because neither has an answer to give. `java:downloadProgress` is the one push the main
 * process makes into the renderer, sent straight to the window that invoked `java:download` rather than broadcast.
 *
 * Exactly four channels write `traquity.config.json`: `auth:forget` removes one `auth` entry through
 * `authRegistry.forget`, `config:apply` sets `env.TQ_DB_FILE_PATH` and `java` through `configurationWriter.apply`,
 * `app:restartAndConfigure` sets `configureOnNextStart` through `restartIntoConfiguration.restart`, and `ai:confirm`
 * sets `ai.confirmedNotice` (and `ai.models`, the first time) through `aiRegistry.confirm`. Nothing here ever
 * *writes* an `auth` entry: recording one is a proven start's job.
 *
 * A TLS-overridden environment collapses the registration to two channels - `startup:getState` and `app:quit` -
 * before anything else is registered: with no `java:download`, no `backend:start` and no `config:apply` registered,
 * "nothing can be done" is enforced by architecture.
 *
 * Every channel is registered behind `isTrustedSender`, which runs before that channel's own argument schema: a
 * registration is per channel name rather than per frame, so *which* frame sent an event is a question only the event
 * itself answers, and it has to be answered before any argument of it is looked at.
 */

/**
 * `require('electron')` is not loadable under jest (`testEnvironment: 'node'`), so this module must not import it.
 * Electron's real `ipcMain` is structurally assignable to this minimal shape.
 *
 * @typedef {Object} IpcMainLike
 * @property {(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => void} handle
 * @property {(channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void} on
 */

/**
 * The one member `java:download` needs off the main window, to push progress to exactly the renderer that asked for
 * it rather than broadcasting.
 *
 * @typedef {Object} ProgressWindowLike
 * @property {{send: (channel: string, progress: JavaDownloadProgress) => void}} webContents
 */

/**
 * What `configure:getState` answers with, beyond `StartupState`. `configFileState` is the snapshot of the single
 * `load()` at start, deliberately not re-derived: `auth:forget` writes the config file later in the run, and this
 * value has to keep describing what the start observed rather than what the file looks like now. `java` is the raw
 * setting straight out of the config, path and signature together, so a configuration that never touches Java can be
 * written back exactly as it was read.
 *
 * @typedef {Object} ConfigureState
 * @property {ConfigFileState} configFileState
 * @property {KnownDatabase[]} knownDatabases
 * @property {string} logPath where the main process writes `traquity.log`
 * @property {{path: string | null, signature: string | null}} java
 */

/**
 * @typedef {Object} AppliedConfiguration
 * @property {string} databasePath
 * @property {AuthState} authState
 */

/**
 * @typedef {Object} JavaPickResult
 * @property {string} setting the raw picked path, or the verified binary it normalized to when verification succeeded
 * @property {JavaVerification} verification
 */

/**
 * What `java:download` answers with: the downloader's own result, plus - for a completed one - the `-version` run
 * that proved the extracted binary runs. The two travel together because the verification happens here, and a
 * completed download is adopted as a setting like any other, with the banner that setting reports.
 *
 * @typedef {{status: 'completed', javaPath: string, signature: string, verification: JavaVerification}
 *   | {status: 'failed', message: string}} JavaDownloadOutcome
 */

/**
 * @typedef {Object} StartupBridgeOptions
 * @property {IpcMainLike} ipcMain
 * @property {Promise<StartupState>} startupState
 * @property {ConfigFileState} configFileState
 * @property {Pick<AiRegistry, 'getState' | 'confirm'>} aiRegistry
 * @property {Pick<BackendProcess, 'start'>} backendProcess
 * @property {Pick<AuthRegistry, 'verify' | 'knownDatabases' | 'forget'>} authRegistry
 * @property {Pick<ConfigurationWriter, 'apply'>} configurationWriter
 * @property {Pick<RestartIntoConfiguration, 'restart'>} restartIntoConfiguration
 * @property {DatabaseDialogs} databaseDialogs
 * @property {Pick<JavaDialogs, 'pickJavaBinary'>} javaDialogs
 * @property {Pick<JavaRuntime, 'verifySetting'>} javaRuntime
 * @property {(onProgress: (progress: JavaDownloadProgress) => void) => Promise<JavaDownloadResult>} downloadJava
 * @property {string} javaDownloadTarget where a download puts a runtime, offered as the picker's starting point when
 *   nothing is configured yet
 * @property {TraQuityConfig} config
 * @property {string} logPath
 * @property {() => void} quit
 * @property {() => ProgressWindowLike | null} getMainWindow
 * @property {boolean} tlsOverridden
 * @property {(event: unknown) => boolean} isTrustedSender whether an IPC event's sender may be served at all
 * @property {() => void} reresolveJava called once `config:apply` has saved, so a later boot-time resolution reuse
 *   sees whatever the save just wrote
 */

/**
 * @param {StartupBridgeOptions} options
 * @returns {{register: () => void}}
 */
function createStartupBridge(options) {
  const {
    ipcMain,
    startupState,
    configFileState,
    aiRegistry,
    backendProcess,
    authRegistry,
    configurationWriter,
    restartIntoConfiguration,
    databaseDialogs,
    javaDialogs,
    javaRuntime,
    downloadJava,
    javaDownloadTarget,
    config,
    logPath,
    quit,
    getMainWindow,
    tlsOverridden,
    isTrustedSender,
    reresolveJava
  } = options;

  // set for as long as a download runs, so `java:download` stays single-flight whatever the renderer does
  let downloading = false;

  /**
   * Registers a request/response channel that refuses an untrusted sender by throwing, which is what `ipcMain.handle`
   * turns into a rejected `invoke` on the other side - the same shape a rejected argument schema takes.
   *
   * @param {string} channel
   * @param {(event: unknown, ...args: unknown[]) => unknown} listener
   * @returns {void}
   */
  function handle(channel, listener) {
    ipcMain.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event)) {
        throw new Error(`Refused ${channel} from an untrusted sender`);
      }
      return listener(event, ...args);
    });
  }

  /**
   * Registers a one-way channel. An untrusted sender is dropped rather than reported: there is no answer to reject.
   *
   * @param {string} channel
   * @param {(event: unknown, ...args: unknown[]) => void} listener
   * @returns {void}
   */
  function on(channel, listener) {
    ipcMain.on(channel, (event, ...args) => {
      if (!isTrustedSender(event)) {
        return;
      }
      listener(event, ...args);
    });
  }

  /**
   * @returns {void}
   */
  function register() {
    handle('startup:getState', () => startupState);

    if (tlsOverridden) {
      on('app:quit', () => quit());
      return;
    }

    handle('backend:start', (_event, password) => {
      const parsedPassword = backendStartPasswordSchema.safeParse(password);
      if (!parsedPassword.success) {
        throw new Error('Invalid password argument for backend:start');
      }
      return backendProcess.start(parsedPassword.data ?? '');
    });

    handle('auth:verify', (_event, password) => {
      const parsedPassword = authVerifyPasswordSchema.safeParse(password);
      if (!parsedPassword.success) {
        throw new Error('Invalid password argument for auth:verify');
      }
      /** @type {string | null} */
      const databasePath = config.env.TQ_DB_FILE_PATH ?? null;
      return databasePath != null && authRegistry.verify(databasePath, parsedPassword.data);
    });

    handle('configure:getState', () => {
      /** @type {ConfigureState} */
      const configureState = {
        configFileState,
        knownDatabases: authRegistry.knownDatabases(),
        logPath,
        java: {path: config.java?.path ?? null, signature: config.java?.signature ?? null}
      };
      return configureState;
    });

    handle('database:pickExisting', (_event, currentSelection) => {
      const parsedSelection = databaseSelectionSchema.safeParse(currentSelection);
      if (!parsedSelection.success) {
        throw new Error('Invalid currentSelection argument for database:pickExisting');
      }
      return databaseDialogs.pickExisting(parsedSelection.data);
    });

    handle('database:pickNew', (_event, currentSelection) => {
      const parsedSelection = databaseSelectionSchema.safeParse(currentSelection);
      if (!parsedSelection.success) {
        throw new Error('Invalid currentSelection argument for database:pickNew');
      }
      return databaseDialogs.pickNew(parsedSelection.data);
    });

    handle('auth:forget', (_event, databasePath) => {
      const parsedDatabasePath = databasePathSchema.safeParse(databasePath);
      if (!parsedDatabasePath.success) {
        throw new Error('Invalid databasePath argument for auth:forget');
      }
      authRegistry.forget(parsedDatabasePath.data);
    });

    handle('config:apply', (_event, changes) => {
      const parsedChanges = configurationChangesSchema.safeParse(changes);
      if (!parsedChanges.success) {
        throw new Error('Invalid changes argument for config:apply');
      }
      /** @type {AppliedConfiguration} */
      const applied = {
        databasePath: parsedChanges.data.databasePath,
        authState: configurationWriter.apply(parsedChanges.data)
      };
      reresolveJava();
      return applied;
    });

    handle('java:verify', (_event, setting) => {
      const parsedSetting = javaSettingSchema.safeParse(setting);
      if (!parsedSetting.success) {
        throw new Error('Invalid setting argument for java:verify');
      }
      return javaRuntime.verifySetting(parsedSetting.data);
    });

    handle('java:pick', (_event, currentSetting) => {
      const parsedSetting = javaSettingSchema.safeParse(currentSetting);
      if (!parsedSetting.success) {
        throw new Error('Invalid currentSetting argument for java:pick');
      }
      return javaDialogs.pickJavaBinary(parsedSetting.data, javaDownloadTarget).then(async (pickedPath) => {
        if (pickedPath == null) {
          return null;
        }
        const verification = await javaRuntime.verifySetting(pickedPath);
        return {
          setting: verification.status === 'ok' ? verification.javaPath : pickedPath,
          verification
        };
      });
    });

    handle('java:download', async () => {
      // a download replaces a directory: two of them at once would each remove what the other is extracting into. The
      // guard is here rather than in whatever asks for one, so a second call is refused however it arrives.
      if (downloading) {
        return {status: 'failed', message: 'A Java download is already running'};
      }
      downloading = true;

      /** @type {JavaDownloadResult} */
      let result;
      try {
        result = await downloadJava(progress => {
          const window = getMainWindow();
          if (window != null) {
            window.webContents.send('java:downloadProgress', progress);
          }
        });
      } finally {
        downloading = false;
      }
      if (result.status !== 'completed') {
        return result;
      }
      const verification = await javaRuntime.verifySetting(result.javaPath);
      if (verification.status !== 'ok') {
        return {status: 'failed', message: verification.message};
      }
      return {...result, verification};
    });

    handle('ai:getState', () => aiRegistry.getState());

    handle('ai:confirm', () => aiRegistry.confirm());

    on('app:restartAndConfigure', () => restartIntoConfiguration.restart());
    on('app:quit', () => quit());
  }

  return {register};
}

module.exports = {createStartupBridge};
