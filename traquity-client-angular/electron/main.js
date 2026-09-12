const {app, dialog, ipcMain} = require('electron');
const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawnSync;
const path = require('path');
const fs = require('fs');
const os = require('os');
const {createConfigFile} = require('./config/config-file.js');
const {createAuthRegistry} = require('./config/auth-registry.js');
const {createAiRegistry} = require('./ai/ai-registry.js');
const {createPromptResolver} = require('./ai/prompt-resolver.js');
const {createLocalInference} = require('./ai/local-inference.js');
const {createInferenceLock} = require('./ai/inference-lock.js');
const {createTransactionExtractor} = require('./ai/transaction-extraction/transaction-extractor.js');
const {CATALOGUE} = require('./ai/catalogue.js');
const {downloadModel} = require('./ai/model-download.js');
const {probeMachineCapability} = require('./ai/machine-capability.js');
const {hasEnoughFreeSpace} = require('./download/free-space.js');
const {createConfigurationWriter} = require('./config/configuration-writer.js');
const {createConfigureOnNextStart} = require('./config/configure-on-next-start.js');
const {createRestartIntoConfiguration} = require('./app/restart-into-configuration.js');
const {BACKEND_PID_URL, createBackendReachability} = require('./backend/backend-reachable.js');
const {createBackendProcess} = require('./backend/backend-process.js');
const {createDatabaseDialogs} = require('./window/database-dialogs.js');
const {createJavaDialogs} = require('./window/java-dialogs.js');
const {createAiDialogs} = require('./window/ai-dialogs.js');
const {createStartupMode} = require('./window/startup-mode.js');
const {createStartupBridge} = require('./ipc/startup-bridge.js');
const {createAiBridge} = require('./ipc/ai-bridge.js');
const {isTrustedSender} = require('./ipc/trusted-sender.js');
const {createMainWindow, getMainWindow} = require('./window/main-window.js');
const {findJavaOnPath, normalizeToJavaBinary} = require('./java/java-path.js');
const {runJavaVersion} = require('./java/java-version.js');
const {createJavaRuntime} = require('./java/java-runtime.js');
const {downloadCorretto, downloadTarget, resolveTarPath} = require('./java/corretto-download.js');
const {verifyDetachedSignature} = require('./java/corretto-signature.js');
const {CORRETTO_PUBLIC_KEY} = require('./java/corretto-public-key.js');
const {isTlsOverridden} = require('./security/tls-override.js');
const {createLogFile} = require('./logging/log-file.js');

if (process.platform === 'darwin') {
  process.chdir(path.resolve(process.argv0, '..', '..', '..', '..'));
}

const resourcesDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources');
const backendPath = path.join(resourcesDir, 'backend.jar');
const aiNoticePath = path.join(resourcesDir, 'ai-notice.component.html');
const packagedPromptsDir = path.join(resourcesDir, 'prompts');

// the app's own technical input/output goes here, e.g. `traquity.config.json` and `traquity.log`
const appDataDir = path.join(os.homedir(), 'traquity');
ensureAppDataDir();

const logPath = path.join(appDataDir, 'traquity.log');
const logFile = createLogFile({fileSystem: fs, logPath});

const configFile = createConfigFile({
  fileSystem: fs,
  configFilePath: path.join(appDataDir, 'traquity.config.json')
});
const {config, state: configFileState} = configFile.load();
const authRegistry = createAuthRegistry({configFile, config});
const aiRegistry = createAiRegistry({
  configFile,
  config,
  noticePath: aiNoticePath,
  fileSystem: fs
});
const promptResolver = createPromptResolver({
  overrideDirectory: path.join(appDataDir, 'ai', 'prompts'),
  packagedDirectory: packagedPromptsDir,
  fileSystem: fs
});
const localInference = createLocalInference({
  resolveLlama,
  isOutOfMemory,
  log: logFile.write
});
// every usecase runs the model through this one lock, so a request of any kind refuses one of any other kind
const inferenceLock = createInferenceLock({runInference: localInference.run, log: logFile.write});
const transactionExtractor = createTransactionExtractor({
  promptResolver,
  aiRegistry,
  runInference: inferenceLock.run,
  log: logFile.write
});
const configurationWriter = createConfigurationWriter({configFile, config, authRegistry});
const configureOnNextStart = createConfigureOnNextStart({configFile, config});
const backendReachability = createBackendReachability({
  fetchPid: fetchBackendPid,
  delay
});
const databaseDialogs = createDatabaseDialogs({
  dialog,
  getParentWindow: getMainWindow,
  fileSystem: fs
});
const javaDialogs = createJavaDialogs({
  dialog,
  getParentWindow: getMainWindow,
  fileSystem: fs
});
const aiDialogs = createAiDialogs({
  dialog,
  getParentWindow: getMainWindow
});
// `NodeJS.ProcessEnv` is a pure index signature (`interface ProcessEnv extends Dict<string> {}`), so it is never
// structurally assignable to named keys a boundary declares as required, as a `Pick<>` of them does - the assertion
// is what the real `process.env` needs there, not a sign of a wrong type upstream.
const pathEnvironment = /** @type {Pick<NodeJS.ProcessEnv, 'PATH' | 'PATHEXT'>} */ (process.env);

const javaRuntime = createJavaRuntime({
  config,
  findJavaOnPath: () => findJavaOnPath(pathEnvironment, fs, process.platform),
  normalizeToJavaBinary: (pickedPath) => normalizeToJavaBinary(pickedPath, fs, process.platform),
  runJavaVersion: (binaryPath) => runJavaVersion(binaryPath, {spawn: spawnJavaProbe})
});

/** @type {boolean} */
const tlsOverridden = isTlsOverridden(process.env);

// resolved once and reused by both the startup mode and a `backend:start` spawn, so a boot-straight-through start
// probes Java exactly once; only `config:apply`'s re-resolution (below) ever reassigns this.
/** @type {Promise<string | null>} */
let javaPromise = tlsOverridden ? Promise.resolve(null) : javaRuntime.resolve();

// resolved once and reused by every `ai:getState` call
/** @type {Promise<import('./ai/machine-capability.js').MachineCapability | null>} */
const machineCapabilityPromise = tlsOverridden ? Promise.resolve(null) : probeMachineCapability(resolveLlama);

const backendProcess = createBackendProcess({
  spawn: spawnChildProcess,
  resolveJava: () => javaPromise,
  backendPath,
  config,
  authRegistry,
  backendReachability,
  logFileSystem: fs,
  logPath
});

const restartIntoConfiguration = createRestartIntoConfiguration({configureOnNextStart, backendProcess, app});

const startupMode = createStartupMode({
  configFile,
  configFileState,
  config,
  authRegistry,
  resolveJava: () => javaPromise,
  tlsOverridden
});

/**
 * A thin wrapper around `child_process.spawn`, typed to exactly the three-argument call `backendProcess` makes - `spawn`
 * itself is overloaded across many stdio configurations, and assigning the bare function to `BackendProcessOptions.spawn`
 * cannot pick the right overload, while a normal call expression like this one resolves it the same way it always has.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{env: NodeJS.ProcessEnv}} spawnOptions
 * @returns {import('./backend/backend-process.js').SpawnedBackendProcess}
 */
function spawnChildProcess(command, args, spawnOptions) {
  return spawn(command, args, spawnOptions);
}

/**
 * The same wrapper for the java probe's own three-argument call - its `stdio` tuple is what selects the overload
 * whose `stdout`/`stderr` are streams rather than `null`.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {import('./java/java-version.js').JavaVersionSpawnOptions} spawnOptions
 * @returns {import('./java/java-version.js').JavaVersionChildProcess}
 */
function spawnJavaProbe(command, args, spawnOptions) {
  return spawn(command, args, spawnOptions);
}

/**
 * @param {(progress: import('./java/corretto-download.js').JavaDownloadProgress) => void} onProgress
 * @returns {Promise<import('./java/corretto-download.js').JavaDownloadResult>}
 */
function downloadJava(onProgress) {
  return downloadCorretto({
    fetch,
    fileSystem: fs,
    spawnSync,
    resolveTarPath,
    now: () => Date.now(),
    delay,
    verifySignature: (archivePath, signatureBytes) => verifyDetachedSignature({
      archivePath,
      signatureBytes,
      publicKey: CORRETTO_PUBLIC_KEY,
      createReadStream: filePath => fs.createReadStream(filePath)
    }),
    onProgress,
    platform: process.platform,
    arch: process.arch
  });
}

/**
 * `node-llama-cpp` ships ESM-only, so this process's CommonJS `main.js` reaches it through a dynamic `import()`
 * instead of a static `require`.
 *
 * @returns {Promise<import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).Llama>}
 */
async function resolveLlama() {
  const {getLlama} = await import('node-llama-cpp');
  // `build: 'never'` states what this app relies on instead of leaving it to a library default: the probe uses a
  // prebuilt binary or fails, and never compiles llama.cpp
  return getLlama({
    build: 'never',
    // what the library reports about a model goes to this process's stdout otherwise, which a packaged app has
    // nowhere to show
    logger: (level, message) => logFile.write(`[node-llama-cpp] ${level}: ${message}`)
  });
}

/**
 * Whether a failure was memory refusing an allocation. The class is the library's own, so it is reached where the
 * library is, and a failure to reach it answers `false` - a failure that cannot be classified is not retried.
 *
 * @param {unknown} error
 * @returns {Promise<boolean>}
 */
async function isOutOfMemory(error) {
  try {
    const {InsufficientMemoryError} = await import('node-llama-cpp');
    return error instanceof InsufficientMemoryError;
  } catch {
    return false;
  }
}

/**
 * @param {import('./ai/catalogue.js').CatalogueRecord} entry
 * @param {string} targetDirectory
 * @param {(progress: import('./ai/model-download.js').AiDownloadProgress) => void} onProgress
 * @returns {Promise<import('./ai/model-download.js').ModelDownloadResult>}
 */
function downloadAiModel(entry, targetDirectory, onProgress) {
  return downloadModel({
    entry,
    targetDirectory,
    fetch,
    fileSystem: fs,
    now: () => Date.now(),
    onProgress
  });
}

/**
 * @param {string} directory
 * @param {number} requiredBytes
 * @returns {boolean}
 */
function checkFreeSpace(directory, requiredBytes) {
  return hasEnoughFreeSpace(directory, requiredBytes, fs);
}

/**
 * Creates `appDataDir` if it does not exist yet, so that both `configFile.save()` and the backend's log writes have
 * somewhere to land - neither creates its own parent directory. A failure is logged rather than thrown: the write it
 * would have enabled fails on its own terms right after, through its own existing error handling.
 *
 * @returns {void}
 */
function ensureAppDataDir() {
  try {
    fs.mkdirSync(appDataDir, {recursive: true});
  } catch (error) {
    console.error(`Failed to create ${appDataDir}:`, error);
  }
}

/**
 * @returns {void}
 */
function removePreviousLog() {
  try {
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  } catch (error) {
    // non-fatal - worst case the previous run's log lines stay at the top since we open in append mode below
    console.error(`Failed to remove previous log file at ${logPath}:`, error);
  }
}

/**
 * @returns {Promise<boolean>}
 */
async function fetchBackendPid() {
  try {
    /** @type {Response} */
    const response = await fetch(BACKEND_PID_URL);
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function delay(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

app.on('ready', () => {
  removePreviousLog();
  const startupStatePromise = startupMode.resolve();
  createStartupBridge({
    ipcMain,
    startupState: startupStatePromise,
    configFileState,
    hasEnoughFreeSpace: checkFreeSpace,
    backendProcess,
    authRegistry,
    configurationWriter,
    restartIntoConfiguration,
    databaseDialogs,
    javaDialogs,
    javaRuntime,
    downloadJava,
    javaDownloadTarget: downloadTarget(),
    javaDownloadDirectory: path.dirname(downloadTarget()),
    config,
    logPath,
    quit: () => app.quit(),
    getMainWindow,
    tlsOverridden,
    isTrustedSender: (event) => isTrustedSender(event, getMainWindow()),
    reresolveJava: () => {
      javaPromise = javaRuntime.resolve();
    }
  }).register();
  createAiBridge({
    ipcMain,
    aiRegistry,
    catalogue: CATALOGUE,
    aiDialogs,
    downloadModel: downloadAiModel,
    hasEnoughFreeSpace: checkFreeSpace,
    getMachineCapability: () => machineCapabilityPromise,
    extractTransaction: transactionExtractor.extract,
    getMainWindow,
    tlsOverridden,
    isTrustedSender: (event) => isTrustedSender(event, getMainWindow())
  }).register();
  createMainWindow();
});

app.on('window-all-closed', () => {
  backendProcess.kill();
  app.quit();
  process.exit(0);
});
