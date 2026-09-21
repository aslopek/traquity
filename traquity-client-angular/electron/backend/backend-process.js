const {jvmEnvironment} = require('../java/jvm-environment.js');

/** @import {AuthRegistry} from '../config/auth-registry.js' */
/** @import {AuthState} from '../config/auth.js' */
/** @import {TraQuityConfig} from '../config/config-schema.js' */
/** @import {BackendReachability} from './backend-reachable.js' */

/**
 * Owns the backend child process: spawning it, piping its log, guarding against a second concurrent spawn, and
 * recording a proven start. The config is read live at spawn time rather than captured at construction: the loaded
 * config object is mutated during a run, and a captured value would silently spawn against an old database.
 *
 * Never logs the password, not even in an error path - `config/auth.js`'s rule applies here too.
 */

/**
 * What a start attempt says about the database it was made against. `startedFrom` is the state read *before* the
 * password was applied, which is what a failed start has to be routed on (epic ADR-003).
 *
 * @typedef {{reachable: boolean, startedFrom: AuthState}} BackendStartOutcome
 */

/**
 * The subset of `fs` required to log the backend's output - declared minimally, according to the
 * architecture guidelines.
 *
 * @typedef {Object} BackendLogFileSystem
 * @property {(path: string, options: {flags: string, mode: number}) => import('node:fs').WriteStream} createWriteStream
 */

/**
 * The mode the log file is created with: readable and writable by its owner only. Whatever a backend prints - queries,
 * stack traces, the data they carry - is readable to every local account under a default umask otherwise. It applies
 * to a file being created, so a log already on disk keeps the mode it has.
 *
 * @type {number}
 */
const LOG_FILE_MODE = 0o600;

/**
 * How long a backend gets to shut down after its stdin was closed, before it is killed.
 *
 * @type {number}
 */
const SHUTDOWN_TIMEOUT_MILLISECONDS = 10_000;

/**
 * The subset of the child's stdin this module writes through: the password's line, kept open for the rest of the run
 * and closed only to ask the backend to shut down.
 *
 * @typedef {Object} BackendStdin
 * @property {(chunk: Buffer, callback: () => void) => boolean} write false signals backpressure, never a failed write
 * @property {() => void} end
 * @property {(event: 'error', listener: (error: Error) => void) => void} on
 */

/**
 * The subset of `ChildProcessWithoutNullStreams` this module actually touches - declared minimally,
 * according to the architecture guidelines.
 *
 * @typedef {Object} SpawnedBackendProcess
 * @property {(event: 'exit' | 'error' | 'close', listener: () => void) => void} on
 * @property {{pipe: (destination: import('node:fs').WriteStream, options: {end: boolean}) => void}} stdout
 * @property {{pipe: (destination: import('node:fs').WriteStream, options: {end: boolean}) => void}} stderr
 * @property {(signal: NodeJS.Signals) => void} kill
 * @property {BackendStdin} stdin
 */

/**
 * @typedef {Object} BackendProcessOptions
 * @property {(command: string, args: string[], options: {env: NodeJS.ProcessEnv}) => SpawnedBackendProcess} spawn
 * @property {() => Promise<string | null>} resolveJava injected, so how a JVM is found stays outside this module;
 *   null means no runtime resolved, which spawns nothing
 * @property {string} backendPath
 * @property {TraQuityConfig} config read live at spawn time
 * @property {Pick<AuthRegistry, 'recordProvenStart' | 'stateOf'>} authRegistry
 * @property {BackendReachability} backendReachability
 * @property {BackendLogFileSystem} logFileSystem
 * @property {string} logPath
 * @property {(milliseconds: number) => Promise<void>} delay
 * @property {Pick<Console, 'error'>} [logger]
 */

/**
 * @typedef {Object} BackendProcess
 * @property {(password: string) => Promise<BackendStartOutcome>} start
 * @property {() => Promise<void>} stop
 */

/**
 * @param {BackendProcessOptions} options
 * @returns {BackendProcess}
 */
function createBackendProcess(options) {
  const {spawn, resolveJava, backendPath, config, authRegistry, backendReachability, logFileSystem, logPath, delay} = options;
  const logger = options.logger ?? console;

  /** @type {SpawnedBackendProcess | null} */
  let child = null;

  // set synchronously by `start`, before its first `await`. Java resolution is itself a spawned process, so a guard
  // reading `child` alone would let two overlapping calls through and spawn twice - and the first child would then be
  // orphaned, with nothing holding a reference `stop()` could reach.
  let starting = false;

  /**
   * Whether a backend is running or on its way up - both refuse a further start.
   *
   * @returns {boolean}
   */
  function isRunning() {
    return starting || child != null;
  }

  /**
   * The child's environment: what the app runs with, the configured entries, and the marker that tells the backend to take
   * the database password from its stdin instead. What `jvm-environment.js` strips is stripped *after* the config file's
   * own entries are merged in, so neither an inherited nor a hand-written `TQ_DB_FILE_PASSWORD` can put a plaintext
   * password back into the very environment block this channel exists to keep it out of.
   *
   * @returns {NodeJS.ProcessEnv}
   */
  function backendEnvironment() {
    return jvmEnvironment({
      ...process.env,
      ...config.env,
      TQ_DB_FILE_PASSWORD_STDIN: 'true'
    });
  }

  /**
   * Writes the password as the first line of the child's stdin: its UTF-8 bytes followed by one line feed. A
   * passwordless database writes the bare line feed, which is the explicit passwordless handover. The stream is left
   * open - closing it is a shutdown request, not part of the handover.
   *
   * Returns synchronously, and the start deliberately does not await the write: a child that never drains would
   * otherwise stall `start` before the reachability poll - the one place a failed start is decided - ever gets to run.
   *
   * @param {Pick<SpawnedBackendProcess, 'stdin'>} spawnedProcess
   * @param {string} password
   * @returns {void}
   */
  function handOverPassword(spawnedProcess, password) {
    const stdin = spawnedProcess.stdin;

    // a JVM that died before reading (unusable java, corrupt jar) makes the write fail with EPIPE; an unhandled `error`
    // event on the stream would take the main process down with it. The message never carries the payload.
    stdin.on('error', (error) => logger.error('Failed to hand the database password to the backend:', error.message));

    /** @type {Buffer<ArrayBuffer>} */
    const lineBytes = Buffer.from(`${password}\n`, 'utf8');
    // Node queues the chunk by reference, so the buffer is zeroed only after the write calls back
    stdin.write(lineBytes, () => lineBytes.fill(0));
  }

  /**
   * @param {string} password
   * @returns {Promise<BackendStartOutcome>}
   */
  async function start(password) {
    if (isRunning()) {
      throw new Error('A backend is already running');
    }
    starting = true;

    try {
      /** @type {string | null} */
      const databasePath = config.env.TQ_DB_FILE_PATH ?? null;
      /** @type {AuthState} */
      const startedFrom = databasePath == null ? 'pending' : authRegistry.stateOf(databasePath);
      /** @type {string | null} */
      const java = await resolveJava();
      if (java == null) {
        logToFile('No Java runtime resolved; backend not started.');
        return {reachable: false, startedFrom};
      }
      /** @type {SpawnedBackendProcess} */
      const spawnedProcess = spawn(java, ['-jar', backendPath], {env: backendEnvironment()});
      child = spawnedProcess;

      /**
       * @returns {void}
       */
      function forget() {
        if (child === spawnedProcess) {
          child = null;
        }
      }

      spawnedProcess.on('exit', forget);
      spawnedProcess.on('error', forget);
      handOverPassword(spawnedProcess, password);
      pipeLog(spawnedProcess);

      // a backend that answers proves the H2 file was decrypted with this password - and only then is it recorded
      const reachable = await backendReachability.waitUntilReachable(spawnedProcess);
      if (reachable && databasePath != null) {
        authRegistry.recordProvenStart(databasePath, password);
      }
      return {reachable, startedFrom};
    } finally {
      // a start that got as far as a running child leaves `child` to answer `isRunning`; a failed one has already
      // cleared it from the child's own `exit`/`error`, so a later start never finds a stale one
      starting = false;
    }
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  function logToFile(message) {
    try {
      const logStream = logFileSystem.createWriteStream(logPath, {flags: 'a', mode: LOG_FILE_MODE});
      logStream.on('error', (error) => logger.error(`Failed to write to ${logPath}:`, error));
      logStream.end(`${message}\n`);
    } catch (error) {
      logger.error(`Failed to write to ${logPath}:`, error);
    }
  }

  /**
   * @param {SpawnedBackendProcess} spawnedProcess
   * @returns {void}
   */
  function pipeLog(spawnedProcess) {
    try {
      /** @type {import('node:fs').WriteStream} */
      const logStream = logFileSystem.createWriteStream(logPath, {flags: 'a', mode: LOG_FILE_MODE});
      logStream.on('error', (error) => logger.error(`Failed to write backend log to ${logPath}:`, error));
      spawnedProcess.stdout.pipe(logStream, {end: false});
      spawnedProcess.stderr.pipe(logStream, {end: false});
      spawnedProcess.on('close', () => logStream.end());
    } catch (error) {
      logger.error(`Failed to set up backend logging at ${logPath}:`, error);
    }
  }

  /**
   * Asks the running backend to shut down and resolves once it exited or was killed for taking longer than `SHUTDOWN_TIMEOUT_MILLISECONDS`.
   * Resolves immediately when no child is running. The child is forgotten up front, so a later start spawns a new one either way.
   *
   * @returns {Promise<void>}
   */
  async function stop() {
    /** @type {SpawnedBackendProcess | null} */
    const runningChild = child;
    if (runningChild == null) {
      return;
    }
    child = null;

    /** @type {Promise<'exited'>} */
    const exited = new Promise(resolve => runningChild.on('exit', () => resolve('exited')));
    runningChild.stdin.end();

    /** @type {'exited' | 'timeout'} */
    const outcome = await Promise.race([exited, delay(SHUTDOWN_TIMEOUT_MILLISECONDS).then(() => /** @type {'timeout'} */ ('timeout'))]);
    if (outcome === 'timeout') {
      runningChild.kill('SIGKILL');
    }
  }

  return {start, stop};
}

module.exports = {createBackendProcess};
