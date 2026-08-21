const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createConfigFile} = require('./config-file.js');
const {storedScryptEntry} = require('../testing/stored-scrypt-entry.js');
const {MAXIMUM_SIGNATURE_LENGTH} = require('../security/signature-bounds.js');

/** @import {ConfigFile, ConfigFileSystem} from './config-file.js' */
/** @import {TraQuityConfig} from './config-schema.js' */

/**
 * Where a home directory actually is on the platform running the specs, so the stored contents read like a real
 * config file rather than like a path that could never occur.
 *
 * @typedef {Object} PlatformPaths
 * @property {string} configFilePath
 * @property {string} databasePath
 */

/** @returns {PlatformPaths} */
function platformPaths() {
  if (process.platform === 'win32') {
    return {
      configFilePath: 'C:\\Users\\x\\traquity.config.json',
      databasePath: 'C:\\Users\\x\\traquity'
    };
  }
  if (process.platform === 'darwin') {
    return {
      configFilePath: '/Users/x/traquity.config.json',
      databasePath: '/Users/x/traquity'
    };
  }
  return {
    configFilePath: '/home/x/traquity.config.json',
    databasePath: '/home/x/traquity'
  };
}

describe('configFile', () => {
  const {configFilePath, databasePath} = platformPaths();

  /** @type {TraQuityConfig} */
  let defaultConfiguration;

  /** @type {string} */
  let storedContents;

  /** @type {ConfigFile} */
  let configFile;

  const existsSync = jest.fn(() => true);
  const readFileSync = jest.fn(() => storedContents);
  const writeFileSync = jest.fn();
  const chmodSync = jest.fn();
  const error = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    defaultConfiguration = {
      env: {},
      auth: {}
    };

    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {[databasePath]: storedScryptEntry()}
    });

    /** @type {ConfigFileSystem} */
    const fileSystem = {existsSync, readFileSync, writeFileSync, chmodSync};

    configFile = createConfigFile({
      fileSystem,
      configFilePath,
      logger: {error}
    });
  });

  it('reports an existing configuration file as read', () => {
    const {config, state} = configFile.load();

    expect(state).toBe('read');
    expect(config.env.TQ_DB_FILE_PATH).toBe(databasePath);
    expect(config.auth[databasePath]).toEqual(storedScryptEntry());
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('reports a missing file as missing and proposes no database without writing anything', () => {
    existsSync.mockReturnValueOnce(false);

    expect(configFile.load()).toEqual({config: defaultConfiguration, state: 'missing'});
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('keeps an unknown key', () => {
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      foo: 'bar'
    });

    expect(configFile.load().config['foo']).toEqual('bar');
  });

  it('defaults missing auth map to an empty mapping', () => {
    storedContents = JSON.stringify({env: {TQ_DB_FILE_PATH: databasePath}});

    expect(configFile.load().config.auth).toEqual({});
  });

  it('reads a stored java setting', () => {
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      java: {path: 'C:\\jdk\\bin\\java.exe', signature: 'c2lnbmF0dXJl'}
    });

    expect(configFile.load().config.java).toEqual({path: 'C:\\jdk\\bin\\java.exe', signature: 'c2lnbmF0dXJl'});
  });

  it('drops a java signature longer than the maximum length, keeping the path it belongs to', () => {
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      java: {path: 'C:\\jdk\\bin\\java.exe', signature: 'A'.repeat(MAXIMUM_SIGNATURE_LENGTH + 4)}
    });

    expect(configFile.load().config.java).toEqual({path: 'C:\\jdk\\bin\\java.exe', signature: null});
  });

  it('falls back a java block that does not parse to automatic, without discarding the rest of the config', () => {
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      java: {path: 42}
    });

    const {config, state} = configFile.load();

    expect(state).toBe('read');
    expect(config.java).toEqual({path: null});
  });

  it('defaults a missing ai key to undefined - unconfirmed, nothing installed', () => {
    storedContents = JSON.stringify({env: {TQ_DB_FILE_PATH: databasePath}, auth: {}});

    expect(configFile.load().config).toEqual({env: {TQ_DB_FILE_PATH: databasePath}, auth: {}});
    expect(configFile.load().config).not.toHaveProperty('ai');
  });

  it('reads a stored ai confirmedNotice and models map', () => {
    const confirmedNotice = Buffer.alloc(32, 1).toString('base64');
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      ai: {confirmedNotice, models: {'qwen-4b': {path: 'C:\\models\\qwen-4b.gguf', active: true}}}
    });

    expect(configFile.load().config.ai).toEqual({
      confirmedNotice,
      models: {'qwen-4b': {path: 'C:\\models\\qwen-4b.gguf', active: true}}
    });
  });

  it('drops a confirmedNotice that is not valid base64, keeping the rest of the ai key', () => {
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      ai: {confirmedNotice: 'not base64 at all', models: {'qwen-4b': {path: 'C:\\models\\qwen-4b.gguf', active: true}}}
    });

    const {config, state} = configFile.load();

    expect(state).toBe('read');
    expect(config.ai).toEqual({
      confirmedNotice: undefined,
      models: {'qwen-4b': {path: 'C:\\models\\qwen-4b.gguf', active: true}}
    });
  });

  it('falls back an ai value that does not parse to unconfirmed with nothing installed, without discarding the rest of the config', () => {
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {},
      ai: 'not an object'
    });

    const {config, state} = configFile.load();

    expect(state).toBe('read');
    expect(config).toEqual({env: {TQ_DB_FILE_PATH: databasePath}, auth: {}, ai: {}});
  });

  it('keeps arbitrary environment entries', () => {
    storedContents = JSON.stringify({
      env: {
        TQ_DB_FILE_PATH: databasePath,
        TQ_SOMETHING_ELSE: 'value'
      },
      auth: {}
    });

    expect(configFile.load().config.env['TQ_SOMETHING_ELSE']).toBe('value');
  });

  it('keeps the other entries when one auth entry is mangled', () => {
    const otherDatabasePath = `${databasePath}-backup`;
    storedContents = JSON.stringify({
      env: {TQ_DB_FILE_PATH: databasePath},
      auth: {
        [databasePath]: storedScryptEntry(),
        [otherDatabasePath]: {scrypt: {cost: 16384}}
      }
    });

    const {config, state} = configFile.load();

    expect(state).toBe('read');
    expect(config.auth[databasePath]).toEqual(storedScryptEntry());
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  describe('with an unusable file', () => {
    it.each([
      ['contents that are not JSON', 'not json at all'],
      ['an array', '[]'],
      ['a number', '42'],
      ['a missing env block', '{"auth": {}}'],
      ['an environment entry that is not a string', '{"env": {"TQ_DB_FILE_PATH": 42}, "auth": {}}']
    ])('reports %s as unreadable and leaves the file alone', (_description, contents) => {
      storedContents = contents;

      expect(configFile.load()).toEqual({config: defaultConfiguration, state: 'unreadable'});
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('logs the reason it could not read the file', () => {
      const reason = new SyntaxError('Unexpected token');
      readFileSync.mockImplementationOnce(() => {
        throw reason;
      });

      configFile.load();

      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(`Failed to read config from ${configFilePath}, falling back to defaults:`, reason);
    });
  });

  it('reports a failing read of an existing file as unreadable without throwing', () => {
    readFileSync.mockImplementationOnce(() => {
      throw new Error('EACCES');
    });

    expect(configFile.load()).toEqual({config: defaultConfiguration, state: 'unreadable'});
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('writes on an explicit save, readable by its owner only', () => {
    configFile.save(defaultConfiguration);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledWith(configFilePath, JSON.stringify(defaultConfiguration, null, 2),
      {flag: 'w', mode: 0o600});
  });

  it('narrows the permissions of a file that already existed', () => {
    configFile.save(defaultConfiguration);

    expect(chmodSync).toHaveBeenCalledTimes(1);
    expect(chmodSync).toHaveBeenCalledWith(configFilePath, 0o600);
  });

  it('logs a failing write rather than throwing', () => {
    writeFileSync.mockImplementationOnce(() => {
      throw new Error('EACCES');
    });

    expect(() => configFile.save(defaultConfiguration)).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(`Failed to save config to ${configFilePath}:`, new Error('EACCES'));
  });

  it('narrows nothing when the write itself failed', () => {
    writeFileSync.mockImplementationOnce(() => {
      throw new Error('EACCES');
    });

    configFile.save(defaultConfiguration);

    expect(chmodSync).not.toHaveBeenCalled();
  });

  it('logs a failing permission change rather than throwing', () => {
    const reason = new Error('EPERM');
    chmodSync.mockImplementationOnce(() => {
      throw reason;
    });

    expect(() => configFile.save(defaultConfiguration)).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(`Failed to restrict permissions of ${configFilePath}:`, reason);
  });
});
