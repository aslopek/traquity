const {afterEach, beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createBackendProcess} = require('./backend-process.js');

/** @import {AuthRegistry} from '../config/auth-registry.js' */
/** @import {AuthState} from '../config/auth.js' */
/** @import {TraQuityConfig} from '../config/config-schema.js' */
/** @import {BackendLogFileSystem, BackendProcess, BackendStdin, SpawnedBackendProcess} from './backend-process.js' */
/** @import {BackendReachability} from './backend-reachable.js' */

describe('backendProcess', () => {
  const backendPath = 'C:\\app\\resources\\backend.jar';
  const logPath = 'C:\\app\\traquity.log';
  const databasePath = 'C:\\Users\\x\\traquity';
  const password = 'hunter2';
  const java = 'java';

  /** @type {TraQuityConfig} */
  let config;

  /** @type {SpawnedBackendProcess} */
  let child;

  const spawn = jest.fn(/** @type {(command: string, args: string[], options: {env: NodeJS.ProcessEnv}) => SpawnedBackendProcess} */
    (() => child));
  const resolveJava = jest.fn(/** @type {() => Promise<string | null>} */ (() => Promise.resolve(java)));
  const stateOf = jest.fn(/** @type {(databasePath: string) => AuthState} */ (() => 'pending'));
  const recordProvenStart = jest.fn(/** @type {AuthRegistry['recordProvenStart']} */ (() => undefined));
  const waitUntilReachable = jest.fn(() => Promise.resolve(true));
  const createWriteStream = jest.fn(/** @type {(path: string, options: {flags: string, mode: number}) => import('node:fs').WriteStream} */
    (() => logStream));
  const error = jest.fn(/** @type {(message: string, cause: unknown) => void} */ (() => undefined));
  // a stub for something asynchronous models waiting: a delay that resolves immediately would starve `stop`'s race
  const delay = jest.fn(/** @type {(milliseconds: number) => Promise<void>} */ (() => new Promise(() => undefined)));
  // a minimal stand-in for `WriteStream` - only the members this module actually calls on it
  const logStream = /** @type {import('node:fs').WriteStream} */ (/** @type {unknown} */ ({on: jest.fn(), end: jest.fn()}));
  const childOn = jest.fn(/** @type {SpawnedBackendProcess['on']} */ (() => undefined));
  const childStdoutPipe = jest.fn(/** @type {SpawnedBackendProcess['stdout']['pipe']} */ (() => undefined));
  const childStderrPipe = jest.fn(/** @type {SpawnedBackendProcess['stderr']['pipe']} */ (() => undefined));
  const childKill = jest.fn(/** @type {SpawnedBackendProcess['kill']} */ (() => undefined));
  const childStdinWrite = jest.fn(/** @type {BackendStdin['write']} */ (() => true));
  const childStdinEnd = jest.fn(/** @type {BackendStdin['end']} */ (() => undefined));
  const childStdinOn = jest.fn(/** @type {BackendStdin['on']} */ (() => undefined));

  /** @type {BackendProcess} */
  let backendProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    resolveJava.mockResolvedValue(java);
    stateOf.mockReturnValue('pending');
    waitUntilReachable.mockResolvedValue(true);
    createWriteStream.mockReturnValue(logStream);
    childStdinWrite.mockReturnValue(true);
    delay.mockImplementation(() => new Promise(() => undefined));

    config = {
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {}
    };

    child = {
      on: childOn,
      stdout: {pipe: childStdoutPipe},
      stderr: {pipe: childStderrPipe},
      kill: childKill,
      stdin: {
        write: childStdinWrite,
        end: childStdinEnd,
        on: childStdinOn
      }
    };
    spawn.mockImplementation(() => child);

    /** @type {Pick<AuthRegistry, 'recordProvenStart' | 'stateOf'>} */
    const authRegistry = {recordProvenStart, stateOf};

    /** @type {BackendReachability} */
    const backendReachability = {waitUntilReachable};

    /** @type {BackendLogFileSystem} */
    const logFileSystem = {createWriteStream};

    backendProcess = createBackendProcess({
      spawn,
      resolveJava,
      backendPath,
      config,
      authRegistry,
      backendReachability,
      logFileSystem,
      logPath,
      delay,
      logger: {error}
    });
  });

  afterEach(() => {
    // the tests arranging an inherited environment must not leak it into the rest of the run
    delete process.env['TQ_DB_FILE_PASSWORD'];
    delete process.env['JAVA_TOOL_OPTIONS'];
    delete process.env['JDK_JAVA_OPTIONS'];
    delete process.env['_JAVA_OPTIONS'];
  });

  /**
   * Fires every `exit` listener registered on the child so far - `start` registers one to forget the child, and
   * `stop` registers its own to learn the child exited.
   *
   * @returns {void}
   */
  function fireExit() {
    for (const [event, listener] of childOn.mock.calls) {
      if (event === 'exit') {
        /** @type {() => void} */ (listener)();
      }
    }
  }

  it('spawns the resolved java binary with the jar and the stdin marker', async () => {
    await backendProcess.start(password);

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith(java, ['-jar', backendPath], {
      env: expect.objectContaining({
        TQ_DB_FILE_PATH: databasePath,
        TQ_DB_FILE_PASSWORD_STDIN: 'true'
      })
    });
    const env = /** @type {NodeJS.ProcessEnv} */ (spawn.mock.calls[0]?.[2]?.env ?? {});
    expect(Object.keys(env)).not.toContain('TQ_DB_FILE_PASSWORD');
  });

  it('carries no database password anywhere in the spawned environment', async () => {
    await backendProcess.start(password);

    const env = /** @type {NodeJS.ProcessEnv} */ (spawn.mock.calls[0]?.[2]?.env ?? {});
    const stringifiedEnv = JSON.stringify(env);
    expect(stringifiedEnv).not.toContain(password);
    expect(stringifiedEnv).not.toContain('TQ_DB_FILE_PASSWORD"');
    expect(stringifiedEnv).not.toContain('TQ_DB_FILE_PASSWORD\\');
  });

  it('drops a database password the config file carries in its env block', async () => {
    config.env['TQ_DB_FILE_PASSWORD'] = 'from-the-config-file';

    await backendProcess.start(password);

    const env = /** @type {NodeJS.ProcessEnv} */ (spawn.mock.calls[0]?.[2]?.env ?? {});
    const stringifiedEnv = JSON.stringify(env);
    expect(stringifiedEnv).not.toContain('from-the-config-file');
  });

  it("drops a database password inherited from the app's own environment", async () => {
    process.env['TQ_DB_FILE_PASSWORD'] = 'from-the-shell';

    await backendProcess.start(password);

    const env = /** @type {NodeJS.ProcessEnv} */ (spawn.mock.calls[0]?.[2]?.env ?? {});
    const stringifiedEnv = JSON.stringify(env);
    expect(stringifiedEnv).not.toContain('from-the-shell');
  });

  it('drops the variables the spawned JVM would take extra command-line arguments from', async () => {
    process.env['JAVA_TOOL_OPTIONS'] = '-javaagent:/tmp/tool.jar';
    process.env['JDK_JAVA_OPTIONS'] = '-javaagent:/tmp/jdk.jar';
    process.env['_JAVA_OPTIONS'] = '-javaagent:/tmp/underscore.jar';

    await backendProcess.start(password);

    const env = /** @type {NodeJS.ProcessEnv} */ (spawn.mock.calls[0]?.[2]?.env ?? {});
    expect(Object.keys(env)).not.toContain('JAVA_TOOL_OPTIONS');
    expect(Object.keys(env)).not.toContain('JDK_JAVA_OPTIONS');
    expect(Object.keys(env)).not.toContain('_JAVA_OPTIONS');
    expect(JSON.stringify(env)).not.toContain('javaagent');
  });

  it('drops JVM option variables the config file carries in its env block', async () => {
    config.env['_JAVA_OPTIONS'] = '-javaagent:/tmp/from-the-config-file.jar';

    await backendProcess.start(password);

    const env = /** @type {NodeJS.ProcessEnv} */ (spawn.mock.calls[0]?.[2]?.env ?? {});
    expect(Object.keys(env)).not.toContain('_JAVA_OPTIONS');
    expect(JSON.stringify(env)).not.toContain('from-the-config-file');
  });

  it('resolves with a reachable outcome and the state it was started from', async () => {
    stateOf.mockReturnValue('scrypt');

    const outcome = await backendProcess.start(password);

    expect(outcome).toEqual({reachable: true, startedFrom: 'scrypt'});
  });

  it('resolves with an unreachable outcome', async () => {
    waitUntilReachable.mockResolvedValue(false);

    const outcome = await backendProcess.start(password);

    expect(outcome).toEqual({reachable: false, startedFrom: 'pending'});
  });

  it('records a proven start when reachable', async () => {
    await backendProcess.start(password);

    expect(recordProvenStart).toHaveBeenCalledTimes(1);
    expect(recordProvenStart).toHaveBeenCalledWith(databasePath, password);
  });

  it('does not record a proven start when unreachable', async () => {
    waitUntilReachable.mockResolvedValue(false);

    await backendProcess.start(password);

    expect(recordProvenStart).not.toHaveBeenCalled();
  });

  it('does not record a proven start when no database is configured', async () => {
    config.env = {};

    await backendProcess.start(password);

    expect(recordProvenStart).not.toHaveBeenCalled();
  });

  it('pipes stdout and stderr into the log file in append mode', async () => {
    await backendProcess.start(password);

    expect(createWriteStream).toHaveBeenCalledTimes(1);
    expect(createWriteStream).toHaveBeenCalledWith(logPath, {flags: 'a', mode: 0o600});

    expect(childStdoutPipe).toHaveBeenCalledTimes(1);
    expect(childStdoutPipe).toHaveBeenCalledWith(logStream, {end: false});

    expect(childStderrPipe).toHaveBeenCalledTimes(1);
    expect(childStderrPipe).toHaveBeenCalledWith(logStream, {end: false});
  });

  it('writes the password and one line feed as UTF-8 bytes to stdin', async () => {
    await backendProcess.start(password);

    expect(childStdinWrite.mock.calls).toEqual([[Buffer.from(`${password}\n`, 'utf8'), expect.any(Function)]]);
  });

  it('writes a non-ASCII password as UTF-8', async () => {
    const nonAsciiPassword = 'äöüßé';

    await backendProcess.start(nonAsciiPassword);

    expect(childStdinWrite.mock.calls[0]?.[0]).toEqual(Buffer.from(`${nonAsciiPassword}\n`, 'utf8'));
  });

  it('writes a bare line feed for a passwordless database', async () => {
    await backendProcess.start('');

    expect(childStdinWrite.mock.calls).toEqual([[Buffer.from('\n', 'utf8'), expect.any(Function)]]);
  });

  it("leaves the child's stdin open", async () => {
    await backendProcess.start(password);

    expect(childStdinEnd).not.toHaveBeenCalled();
  });

  it("leaves the child's stdin open for a passwordless database", async () => {
    await backendProcess.start('');

    expect(childStdinEnd).not.toHaveBeenCalled();
  });

  it('zeroes the password buffer once the write drained', async () => {
    await backendProcess.start(password);

    const writtenBuffer = /** @type {Buffer} */ (childStdinWrite.mock.calls[0]?.[0]);
    const writeCallback = /** @type {() => void} */ (childStdinWrite.mock.calls[0]?.[1]);
    writeCallback();

    expect(writtenBuffer).toHaveLength(Buffer.byteLength(`${password}\n`, 'utf8'));
    for (const byte of writtenBuffer) {
      expect(byte).toBe(0);
    }
  });

  it('survives a failed write to a child that died before reading', async () => {
    await backendProcess.start(password);

    const errorListener = /** @type {(error: Error) => void} */ (
      childStdinOn.mock.calls.find(([event]) => event === 'error')?.[1]
    );

    expect(() => errorListener(new Error('write EPIPE'))).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Failed to hand the database password to the backend:', 'write EPIPE');
  });

  it('never logs the password when the write fails', async () => {
    await backendProcess.start(password);

    const errorListener = /** @type {(error: Error) => void} */ (
      childStdinOn.mock.calls.find(([event]) => event === 'error')?.[1]
    );
    errorListener(new Error('write EPIPE'));

    for (const call of error.mock.calls) {
      for (const argument of call) {
        expect(String(argument)).not.toContain(password);
      }
    }
  });

  it('leaves the password buffer intact until the write callback runs', async () => {
    await backendProcess.start(password);

    const writtenBuffer = /** @type {Buffer} */ (childStdinWrite.mock.calls[0]?.[0]);
    expect(writtenBuffer).toEqual(Buffer.from(`${password}\n`, 'utf8'));
  });

  describe('when Java does not resolve', () => {
    beforeEach(() => {
      resolveJava.mockResolvedValue(null);
    });

    it('spawns nothing and reports an unreachable outcome', async () => {
      const outcome = await backendProcess.start(password);

      expect(spawn).not.toHaveBeenCalled();
      expect(outcome).toEqual({reachable: false, startedFrom: 'pending'});
    });

    it('logs to the log file', async () => {
      await backendProcess.start(password);

      expect(createWriteStream).toHaveBeenCalledTimes(1);
      expect(createWriteStream).toHaveBeenCalledWith(logPath, {flags: 'a', mode: 0o600});
      expect(logStream.end).toHaveBeenCalledTimes(1);
      expect(logStream.end).toHaveBeenCalledWith('No Java runtime resolved; backend not started.\n');
    });

    it('records no proven start', async () => {
      await backendProcess.start(password);

      expect(recordProvenStart).not.toHaveBeenCalled();
    });
  });

  describe('while a backend is running', () => {
    beforeEach(async () => {
      await backendProcess.start(password);
      jest.clearAllMocks();
    });

    it('rejects a second start', async () => {
      await expect(backendProcess.start(password)).rejects.toThrow('A backend is already running');
    });

    it('does not spawn a second child process', async () => {
      await backendProcess.start(password).catch(() => undefined);

      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe('while a start is still resolving java', () => {
    beforeEach(() => {
      // a java resolution that never settles keeps the first start in flight for the whole test, which is the
      // window in which nothing has been spawned yet and `child` is still null
      resolveJava.mockImplementation(() => new Promise(() => undefined));
      void backendProcess.start(password);
    });

    it('rejects a second start', async () => {
      await expect(backendProcess.start(password)).rejects.toThrow('A backend is already running');
    });

    it('does not spawn a child process for the second start', async () => {
      await backendProcess.start(password).catch(() => undefined);

      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe('after the child exited', () => {
    beforeEach(async () => {
      await backendProcess.start(password);
      const exitCall = childOn.mock.calls.find(([event]) => event === 'exit');
      const exitListener = /** @type {() => void} */ (exitCall?.[1]);
      exitListener();
    });

    it('allows a retry that spawns again with the given password', async () => {
      // clears the first start's spawn call, so the assertion below can only be satisfied by the retry's own
      jest.clearAllMocks();
      const retryPassword = 'hunter3';

      await backendProcess.start(retryPassword);

      expect(spawn).toHaveBeenCalledTimes(1);
      expect(spawn).toHaveBeenCalledWith(java, ['-jar', backendPath], {
        env: expect.objectContaining({TQ_DB_FILE_PASSWORD_STDIN: 'true'})
      });
      expect(childStdinWrite.mock.calls[0]?.[0]).toEqual(Buffer.from(`${retryPassword}\n`, 'utf8'));
    });
  });

  describe('stop', () => {
    it("closes the child's stdin and does not kill it", async () => {
      await backendProcess.start(password);

      const stopped = backendProcess.stop();
      fireExit();
      await stopped;

      expect(childStdinEnd).toHaveBeenCalledTimes(1);
      expect(childStdinEnd).toHaveBeenCalledWith();
      expect(childKill).not.toHaveBeenCalled();
    });

    it('does nothing when no backend has been started', async () => {
      await expect(backendProcess.stop()).resolves.toBeUndefined();

      expect(childStdinEnd).not.toHaveBeenCalled();
      expect(childKill).not.toHaveBeenCalled();
    });

    it('waits for the child to exit before resolving', async () => {
      await backendProcess.start(password);

      const stopped = backendProcess.stop();
      const outcome = await Promise.race([stopped.then(() => 'stopped'), Promise.resolve('still waiting')]);
      expect(outcome).toBe('still waiting');

      fireExit();
      await stopped;
    });

    it('kills a child that outlives the timeout', async () => {
      delay.mockResolvedValue(undefined);
      await backendProcess.start(password);

      await backendProcess.stop();

      expect(childKill).toHaveBeenCalledTimes(1);
      expect(childKill).toHaveBeenCalledWith('SIGKILL');
      expect(delay).toHaveBeenCalledTimes(1);
      expect(delay).toHaveBeenCalledWith(10_000);
    });

    it('forgets the child, so a later start spawns again', async () => {
      await backendProcess.start(password);
      const stopped = backendProcess.stop();
      fireExit();
      await stopped;
      // clears the first start's spawn call, so the assertion below can only be satisfied by the second one
      jest.clearAllMocks();

      await backendProcess.start(password);

      expect(spawn).toHaveBeenCalledTimes(1);
      expect(spawn).toHaveBeenCalledWith(java, ['-jar', backendPath], {
        env: expect.objectContaining({
          TQ_DB_FILE_PATH: databasePath,
          TQ_DB_FILE_PASSWORD_STDIN: 'true'
        })
      });
    });
  });
});
