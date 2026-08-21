const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createStartupBridge} = require('./startup-bridge.js');

/** @import {AiRegistry, AiState} from '../ai/ai-registry.js' */
/** @import {AuthRegistry, KnownDatabase} from '../config/auth-registry.js' */
/** @import {AuthState} from '../config/auth.js' */
/** @import {BackendProcess, BackendStartOutcome} from '../backend/backend-process.js' */
/** @import {ConfigurationChanges, ConfigurationWriter} from '../config/configuration-writer.js' */
/** @import {DatabaseDialogs, PickedDatabase} from '../window/database-dialogs.js' */
/** @import {TraQuityConfig} from '../config/config-schema.js' */
/** @import {JavaDownloadProgress, JavaDownloadResult} from '../java/corretto-download.js' */
/** @import {JavaDialogs} from '../window/java-dialogs.js' */
/** @import {JavaRuntime} from '../java/java-runtime.js' */
/** @import {JavaVerification} from '../java/java-version.js' */
/** @import {RestartIntoConfiguration} from '../app/restart-into-configuration.js' */
/** @import {StartupState} from '../window/startup-mode.js' */
/** @import {IpcMainLike, ProgressWindowLike} from './startup-bridge.js' */

describe('startupBridge', () => {
  const databasePath = 'C:\\Users\\x\\traquity';
  const otherDatabasePath = 'D:\\backup\\traquity-test';
  const logPath = 'C:\\apps\\traquity\\traquity.log';
  const javaPath = 'C:\\jdk\\bin\\java.exe';
  const javaDownloadTarget = 'C:\\apps\\traquity\\java';

  /** @type {StartupState} */
  let startupState;

  /** @type {KnownDatabase[]} */
  let known;

  const handle = jest.fn(/** @type {IpcMainLike['handle']} */ (() => {
  }));
  const on = jest.fn(/** @type {IpcMainLike['on']} */ (() => {
  }));
  const start = jest.fn(/** @type {(password: string) => Promise<BackendStartOutcome>} */
    (() => Promise.resolve({reachable: true, startedFrom: 'pending'})));
  const verify = jest.fn(/** @type {(databasePath: string, candidate: string) => boolean} */ (() => true));
  const knownDatabases = jest.fn(/** @type {() => KnownDatabase[]} */ (() => known));
  const forget = jest.fn(/** @type {(databasePath: string) => void} */ (() => undefined));
  const apply = jest.fn(/** @type {(changes: ConfigurationChanges) => AuthState} */ (() => 'passwordless'));
  const restart = jest.fn();
  const pickExisting = jest.fn(/** @type {DatabaseDialogs['pickExisting']} */
    (() => Promise.resolve(otherDatabasePath)));
  const pickNew = jest.fn(/** @type {DatabaseDialogs['pickNew']} */
    (() => Promise.resolve({basePath: otherDatabasePath, fileExists: false})));
  const pickJavaBinary = jest.fn(/** @type {JavaDialogs['pickJavaBinary']} */ (() => Promise.resolve(javaPath)));
  const verifySetting = jest.fn(/** @type {JavaRuntime['verifySetting']} */
    (() => Promise.resolve(javaVerification)));
  const downloadJava = jest.fn(/** @type {(onProgress: (progress: JavaDownloadProgress) => void) => Promise<JavaDownloadResult>} */
    (() => Promise.resolve({status: 'completed', javaPath, signature: 'c2ln'})));
  const getAiState = jest.fn(/** @type {() => Promise<AiState>} */ (() => Promise.resolve(aiState)));
  const confirmAi = jest.fn(/** @type {() => void} */ (() => undefined));
  const quit = jest.fn();
  const isTrustedSender = jest.fn(/** @type {(event: unknown) => boolean} */ (() => true));
  const reresolveJava = jest.fn();
  const send = jest.fn(/** @type {ProgressWindowLike['webContents']['send']} */ (() => undefined));
  const getMainWindow = jest.fn(/** @type {() => ProgressWindowLike | null} */ (() => ({webContents: {send}})));

  /** @type {JavaVerification} */
  let javaVerification;

  /** @type {AiState} */
  let aiState;

  /** @type {IpcMainLike} */
  let ipcMain;

  /** @type {Pick<AiRegistry, 'getState' | 'confirm'>} */
  let aiRegistry;

  /** @type {Pick<BackendProcess, 'start'>} */
  let backendProcess;

  /** @type {Pick<AuthRegistry, 'verify' | 'knownDatabases' | 'forget'>} */
  let authRegistry;

  /** @type {Pick<ConfigurationWriter, 'apply'>} */
  let configurationWriter;

  /** @type {Pick<RestartIntoConfiguration, 'restart'>} */
  let restartIntoConfiguration;

  /** @type {DatabaseDialogs} */
  let databaseDialogs;

  /** @type {Pick<JavaDialogs, 'pickJavaBinary'>} */
  let javaDialogs;

  /** @type {Pick<JavaRuntime, 'verifySetting'>} */
  let javaRuntime;

  /** @type {TraQuityConfig} */
  let config;

  /** @type {boolean} */
  let tlsOverridden;

  /**
   * @param {string} channel
   * @returns {(event: unknown, ...args: unknown[]) => unknown}
   */
  function handleListenerFor(channel) {
    const call = handle.mock.calls.find(([registeredChannel]) => registeredChannel === channel);
    if (call == null) {
      throw new Error(`No handler registered for ${channel}`);
    }
    return call[1];
  }

  /**
   * @param {string} channel
   * @returns {(event: unknown, ...args: unknown[]) => void}
   */
  function onListenerFor(channel) {
    const call = on.mock.calls.find(([registeredChannel]) => registeredChannel === channel);
    if (call == null) {
      throw new Error(`No 'on' listener registered for ${channel}`);
    }
    return call[1];
  }

  /**
   * @returns {void}
   */
  function createBridge() {
    createStartupBridge({
      ipcMain,
      startupState: Promise.resolve(startupState),
      configFileState: 'read',
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
    }).register();
  }

  beforeEach(() => {
    startupState = {authState: 'scrypt', databasePath, mode: 'unlock'};
    known = [
      {
        path: databasePath,
        authState: 'scrypt'
      }
    ];
    aiState = {isConfirmed: false, catalogue: [], models: {}};

    jest.clearAllMocks();
    javaVerification = {status: 'ok', javaPath, versionOutput: 'openjdk 25'};
    start.mockResolvedValue({reachable: true, startedFrom: 'pending'});
    verify.mockReturnValue(true);
    knownDatabases.mockReturnValue(known);
    apply.mockReturnValue('passwordless');
    pickExisting.mockResolvedValue(otherDatabasePath);
    pickNew.mockResolvedValue({basePath: otherDatabasePath, fileExists: false});
    pickJavaBinary.mockResolvedValue(javaPath);
    verifySetting.mockResolvedValue(javaVerification);
    downloadJava.mockResolvedValue({status: 'completed', javaPath, signature: 'c2ln'});
    getAiState.mockResolvedValue(aiState);
    getMainWindow.mockReturnValue({webContents: {send}});
    isTrustedSender.mockReturnValue(true);
    tlsOverridden = false;

    ipcMain = {handle, on};
    aiRegistry = {getState: getAiState, confirm: confirmAi};
    backendProcess = {start};
    authRegistry = {verify, knownDatabases, forget};
    configurationWriter = {apply};
    restartIntoConfiguration = {restart};
    databaseDialogs = {pickExisting, pickNew};
    javaDialogs = {pickJavaBinary};
    javaRuntime = {verifySetting};
    config = {
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      java: {path: null, signature: null}
    };

    createBridge();
  });

  it('registers exactly the thirteen request/response channels via handle', () => {
    expect(handle.mock.calls.map(([channel]) => channel)).toEqual([
      'startup:getState',
      'backend:start',
      'auth:verify',
      'configure:getState',
      'database:pickExisting',
      'database:pickNew',
      'auth:forget',
      'config:apply',
      'java:verify',
      'java:pick',
      'java:download',
      'ai:getState',
      'ai:confirm'
    ]);
  });

  it('registers exactly the app:restartAndConfigure and app:quit channels via on', () => {
    expect(on.mock.calls.map(([channel]) => channel)).toEqual(['app:restartAndConfigure', 'app:quit']);
  });

  it('resolves startup:getState with the given startup state', async () => {
    await expect(handleListenerFor('startup:getState')(undefined)).resolves.toBe(startupState);
  });

  it('delegates a string password to backendProcess.start', async () => {
    await handleListenerFor('backend:start')(undefined, 'hunter2');

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith('hunter2');
  });

  it('delegates an empty password when none is given', async () => {
    await handleListenerFor('backend:start')(undefined);

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith('');
  });

  it('rejects a non-string password without reaching backendProcess.start', () => {
    expect(() => handleListenerFor('backend:start')(undefined, 42)).toThrow('Invalid password argument for backend:start');
    expect(start).not.toHaveBeenCalled();
  });

  it('propagates a rejection from backendProcess.start', async () => {
    start.mockRejectedValue(new Error('A backend is already running'));

    await expect(handleListenerFor('backend:start')(undefined, 'hunter2')).rejects.toThrow('A backend is already running');
  });

  it('delegates auth:verify to authRegistry.verify with the config database path and returns its result', () => {
    expect(handleListenerFor('auth:verify')(undefined, 'hunter2')).toBe(true);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith(databasePath, 'hunter2');
  });

  it('returns false from auth:verify when authRegistry.verify rejects the password', () => {
    verify.mockReturnValue(false);

    expect(handleListenerFor('auth:verify')(undefined, 'hunter2')).toBe(false);
  });

  describe('when the config names no database', () => {
    beforeEach(() => {
      config.env = {};
    });

    it('returns false from auth:verify without calling authRegistry.verify', () => {
      expect(handleListenerFor('auth:verify')(undefined, 'hunter2')).toBe(false);
      expect(verify).not.toHaveBeenCalled();
    });
  });

  it('rejects a non-string password for auth:verify without reaching authRegistry.verify', () => {
    expect(() => handleListenerFor('auth:verify')(undefined, 42)).toThrow('Invalid password argument for auth:verify');
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a missing password for auth:verify without reaching authRegistry.verify', () => {
    expect(() => handleListenerFor('auth:verify')(undefined)).toThrow('Invalid password argument for auth:verify');
    expect(verify).not.toHaveBeenCalled();
  });

  it('resolves configure:getState with the read outcome, the known databases, the log path and the java setting', () => {
    expect(handleListenerFor('configure:getState')(undefined)).toEqual({
      configFileState: 'read',
      knownDatabases: known,
      logPath,
      java: {path: null, signature: null}
    });
  });

  describe('with a stored java setting', () => {
    beforeEach(() => {
      config.java = {path: javaPath, signature: 'c2ln'};
      createBridge();
    });

    it('reports it from configure:getState', () => {
      expect(handleListenerFor('configure:getState')(undefined)).toEqual({
        configFileState: 'read',
        knownDatabases: known,
        logPath,
        java: {path: javaPath, signature: 'c2ln'}
      });
    });
  });

  it('delegates database:pickExisting to the dialogs and returns the picked base path', async () => {
    await expect(handleListenerFor('database:pickExisting')(undefined, databasePath)).resolves.toBe(otherDatabasePath);
    expect(pickExisting).toHaveBeenCalledTimes(1);
    expect(pickExisting).toHaveBeenCalledWith(databasePath);
  });

  it('passes a null selection to database:pickExisting', async () => {
    await handleListenerFor('database:pickExisting')(undefined, null);

    expect(pickExisting).toHaveBeenCalledTimes(1);
    expect(pickExisting).toHaveBeenCalledWith(null);
  });

  it('rejects a non-string selection for database:pickExisting without opening a dialog', () => {
    expect(() => handleListenerFor('database:pickExisting')(undefined, 42))
      .toThrow('Invalid currentSelection argument for database:pickExisting');
    expect(pickExisting).not.toHaveBeenCalled();
  });

  it('delegates database:pickNew to the dialogs and returns the picked database', async () => {
    await expect(handleListenerFor('database:pickNew')(undefined, databasePath)).resolves.toEqual({
      basePath: otherDatabasePath,
      fileExists: false
    });
    expect(pickNew).toHaveBeenCalledTimes(1);
    expect(pickNew).toHaveBeenCalledWith(databasePath);
  });

  it('rejects a non-string selection for database:pickNew without opening a dialog', () => {
    expect(() => handleListenerFor('database:pickNew')(undefined, 42))
      .toThrow('Invalid currentSelection argument for database:pickNew');
    expect(pickNew).not.toHaveBeenCalled();
  });

  it('delegates auth:forget to the registry', () => {
    handleListenerFor('auth:forget')(undefined, databasePath);

    expect(forget).toHaveBeenCalledTimes(1);
    expect(forget).toHaveBeenCalledWith(databasePath);
  });

  it('rejects an empty database path for auth:forget without reaching the registry', () => {
    expect(() => handleListenerFor('auth:forget')(undefined, '')).toThrow('Invalid databasePath argument for auth:forget');
    expect(forget).not.toHaveBeenCalled();
  });

  it('applies the changes for config:apply and reports the selected database with its state', () => {
    const changes = {databasePath: otherDatabasePath, javaPath: null, javaSignature: null};

    expect(handleListenerFor('config:apply')(undefined, changes)).toEqual({
      databasePath: otherDatabasePath,
      authState: 'passwordless'
    });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(changes);
  });

  it('re-resolves java after applying the changes for config:apply', () => {
    handleListenerFor('config:apply')(undefined, {databasePath: otherDatabasePath, javaPath: null, javaSignature: null});

    expect(reresolveJava).toHaveBeenCalledTimes(1);
    expect(reresolveJava).toHaveBeenCalledWith();
  });

  it('rejects changes carrying an unknown key for config:apply without applying anything', () => {
    expect(() => handleListenerFor('config:apply')(undefined, {databasePath: otherDatabasePath, auth: {}}))
      .toThrow('Invalid changes argument for config:apply');
    expect(apply).not.toHaveBeenCalled();
    expect(reresolveJava).not.toHaveBeenCalled();
  });

  it('delegates java:verify to javaRuntime.verifySetting', async () => {
    await expect(handleListenerFor('java:verify')(undefined, javaPath)).resolves.toEqual({
      status: 'ok',
      javaPath,
      versionOutput: 'openjdk 25'
    });
    expect(verifySetting).toHaveBeenCalledTimes(1);
    expect(verifySetting).toHaveBeenCalledWith(javaPath);
  });

  it('verifies the PATH candidate for a null java:verify setting', async () => {
    await handleListenerFor('java:verify')(undefined, null);

    expect(verifySetting).toHaveBeenCalledTimes(1);
    expect(verifySetting).toHaveBeenCalledWith(null);
  });

  it('rejects an empty string setting for java:verify', () => {
    expect(() => handleListenerFor('java:verify')(undefined, '')).toThrow('Invalid setting argument for java:verify');
    expect(verifySetting).not.toHaveBeenCalled();
  });

  describe('java:pick', () => {
    it('composes the dialog and the verification into a single result', async () => {
      await expect(handleListenerFor('java:pick')(undefined, null)).resolves.toEqual({
        setting: javaPath,
        verification: javaVerification
      });
      expect(pickJavaBinary).toHaveBeenCalledTimes(1);
      expect(pickJavaBinary).toHaveBeenCalledWith(null, javaDownloadTarget);
      expect(verifySetting).toHaveBeenCalledTimes(1);
      expect(verifySetting).toHaveBeenCalledWith(javaPath);
    });

    it('returns null on a cancelled dialog without verifying anything', async () => {
      pickJavaBinary.mockResolvedValue(null);

      await expect(handleListenerFor('java:pick')(undefined, null)).resolves.toBeNull();
      expect(verifySetting).not.toHaveBeenCalled();
    });

    it('reports the raw picked path alongside a failed verification', async () => {
      const pickedPath = 'C:\\not-java\\bin\\java.exe';
      pickJavaBinary.mockResolvedValue(pickedPath);
      verifySetting.mockResolvedValue({status: 'error', message: 'not a JVM'});

      await expect(handleListenerFor('java:pick')(undefined, null)).resolves.toEqual({
        setting: pickedPath,
        verification: {status: 'error', message: 'not a JVM'}
      });
    });

    it('rejects a non-string, non-null current setting', () => {
      expect(() => handleListenerFor('java:pick')(undefined, 42)).toThrow('Invalid currentSetting argument for java:pick');
      expect(pickJavaBinary).not.toHaveBeenCalled();
    });
  });

  describe('java:download', () => {
    it('answers a completed download with its path, its signature and the verification of the extracted binary', async () => {
      await expect(handleListenerFor('java:download')(undefined)).resolves.toEqual({
        status: 'completed',
        javaPath,
        signature: 'c2ln',
        verification: javaVerification
      });
    });

    it('verifies the extracted binary before reporting completion', async () => {
      await handleListenerFor('java:download')(undefined);

      expect(verifySetting).toHaveBeenCalledTimes(1);
      expect(verifySetting).toHaveBeenCalledWith(javaPath);
    });

    it('folds a failed post-download verification into a failed download', async () => {
      verifySetting.mockResolvedValue({status: 'error', message: 'does not run'});

      await expect(handleListenerFor('java:download')(undefined)).resolves.toEqual({
        status: 'failed',
        message: 'does not run'
      });
    });

    it('returns the failed download unchanged without verifying anything', async () => {
      downloadJava.mockResolvedValue({status: 'failed', message: 'HTTP 503'});

      await expect(handleListenerFor('java:download')(undefined)).resolves.toEqual({status: 'failed', message: 'HTTP 503'});
      expect(verifySetting).not.toHaveBeenCalled();
    });

    it('sends progress events to the main window', async () => {
      /** @type {JavaDownloadProgress} */
      const progress = {phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1};
      downloadJava.mockImplementation((onProgress) => {
        onProgress(progress);
        return Promise.resolve({status: 'completed', javaPath, signature: 'c2ln'});
      });

      await handleListenerFor('java:download')(undefined);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('java:downloadProgress', progress);
    });

    it('refuses a second download while one is running, without starting it', async () => {
      /** @type {() => void} */
      let finishFirstDownload = () => undefined;
      downloadJava.mockImplementation(() => new Promise(resolve => {
        finishFirstDownload = () => resolve({status: 'failed', message: 'HTTP 503'});
      }));

      const firstDownload = handleListenerFor('java:download')(undefined);

      await expect(handleListenerFor('java:download')(undefined)).resolves.toEqual({
        status: 'failed',
        message: 'A Java download is already running'
      });
      expect(downloadJava).toHaveBeenCalledTimes(1);
      expect(downloadJava).toHaveBeenCalledWith(expect.any(Function));

      finishFirstDownload();
      await firstDownload;
    });

    it('allows a further download once the running one has ended', async () => {
      downloadJava.mockResolvedValue({status: 'failed', message: 'HTTP 503'});
      await handleListenerFor('java:download')(undefined);

      await expect(handleListenerFor('java:download')(undefined)).resolves.toEqual({status: 'failed', message: 'HTTP 503'});
      expect(downloadJava.mock.calls).toEqual([[expect.any(Function)], [expect.any(Function)]]);
    });

    it('allows a further download after a rejected one', async () => {
      downloadJava.mockRejectedValueOnce(new Error('unreachable'));
      await expect(handleListenerFor('java:download')(undefined)).rejects.toThrow('unreachable');

      await expect(handleListenerFor('java:download')(undefined)).resolves.toEqual({
        status: 'completed',
        javaPath,
        signature: 'c2ln',
        verification: javaVerification
      });
    });

    it('sends no progress when the window is gone', async () => {
      getMainWindow.mockReturnValue(null);
      downloadJava.mockImplementation((onProgress) => {
        onProgress({phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1});
        return Promise.resolve({status: 'completed', javaPath, signature: 'c2ln'});
      });

      await expect(handleListenerFor('java:download')(undefined)).resolves.toEqual({
        status: 'completed',
        javaPath,
        signature: 'c2ln',
        verification: javaVerification
      });
      expect(send).not.toHaveBeenCalled();
    });
  });

  it('resolves ai:getState with the registry\'s own state', async () => {
    await expect(handleListenerFor('ai:getState')(undefined)).resolves.toBe(aiState);
  });

  it('delegates ai:confirm to the registry, taking no argument off the renderer', () => {
    handleListenerFor('ai:confirm')(undefined);

    expect(confirmAi).toHaveBeenCalledTimes(1);
    expect(confirmAi).toHaveBeenCalledWith();
  });

  it('writes nothing when a dialog is opened or a setting is merely verified', async () => {
    await handleListenerFor('database:pickExisting')(undefined, databasePath);
    await handleListenerFor('database:pickNew')(undefined, databasePath);
    await handleListenerFor('java:verify')(undefined, null);

    expect(forget).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it('calls the injected quit for app:quit and spawns no backend and verifies no password', () => {
    onListenerFor('app:quit')(undefined);

    expect(quit).toHaveBeenCalledTimes(1);
    expect(quit).toHaveBeenCalledWith();
    expect(start).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it('calls restart for app:restartAndConfigure and neither quits, starts nor applies anything', () => {
    onListenerFor('app:restartAndConfigure')(undefined);

    expect(restart).toHaveBeenCalledTimes(1);
    expect(restart).toHaveBeenCalledWith();
    expect(quit).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  describe('when the sender is refused', () => {
    /** @type {{senderFrame: string}} an event stood in for by the one member the decision is made on */
    let event;

    beforeEach(() => {
      event = {senderFrame: 'a frame that is not the main one'};
      isTrustedSender.mockReturnValue(false);
    });

    // a password the schema itself would reject, so the message names which of the two checks ran first
    it('refuses backend:start before its password is parsed', () => {
      expect(() => handleListenerFor('backend:start')(event, 42))
        .toThrow('Refused backend:start from an untrusted sender');
      expect(start).not.toHaveBeenCalled();
    });

    it('refuses startup:getState', () => {
      expect(() => handleListenerFor('startup:getState')(event))
        .toThrow('Refused startup:getState from an untrusted sender');
    });

    it('refuses config:apply without writing anything', () => {
      const changes = {databasePath: otherDatabasePath, javaPath: null, javaSignature: null};

      expect(() => handleListenerFor('config:apply')(event, changes))
        .toThrow('Refused config:apply from an untrusted sender');
      expect(apply).not.toHaveBeenCalled();
      expect(reresolveJava).not.toHaveBeenCalled();
    });

    it('refuses ai:confirm without writing anything', () => {
      expect(() => handleListenerFor('ai:confirm')(event))
        .toThrow('Refused ai:confirm from an untrusted sender');
      expect(confirmAi).not.toHaveBeenCalled();
    });

    it('drops app:quit rather than reporting a refusal it has no answer for', () => {
      onListenerFor('app:quit')(event);

      expect(quit).not.toHaveBeenCalled();
    });

    it('drops app:restartAndConfigure', () => {
      onListenerFor('app:restartAndConfigure')(event);

      expect(restart).not.toHaveBeenCalled();
    });

    it('decides on the event the channel was invoked with', () => {
      expect(() => handleListenerFor('auth:verify')(event, 'hunter2')).toThrow();

      expect(isTrustedSender).toHaveBeenCalledTimes(1);
      expect(isTrustedSender).toHaveBeenCalledWith(event);
      expect(verify).not.toHaveBeenCalled();
    });
  });

  describe('when TLS verification is overridden', () => {
    beforeEach(() => {
      tlsOverridden = true;
      jest.clearAllMocks();
      createBridge();
    });

    it('registers only startup:getState via handle', () => {
      expect(handle.mock.calls.map(([channel]) => channel)).toEqual(['startup:getState']);
    });

    it('registers only app:quit via on', () => {
      expect(on.mock.calls.map(([channel]) => channel)).toEqual(['app:quit']);
    });

    it('finds no app:restartAndConfigure listener registered', () => {
      expect(() => onListenerFor('app:restartAndConfigure')(undefined))
        .toThrow('No \'on\' listener registered for app:restartAndConfigure');
      expect(restart).not.toHaveBeenCalled();
    });

    it('still quits on app:quit', () => {
      onListenerFor('app:quit')(undefined);

      expect(quit).toHaveBeenCalledTimes(1);
      expect(quit).toHaveBeenCalledWith();
    });
  });
});
