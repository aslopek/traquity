const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const crypto = require('node:crypto');
const {Readable} = require('node:stream');

const noticePath = 'C:\\apps\\traquity\\resources\\ai-notice.component.html';
const noticeBytes = Buffer.from('<div>notice</div>');
// sha256/base64 digest of noticeBytes above
const noticeDigest = 'MUFMUEmsOQhHvXx/CHHbvxdT39R2PCZE62SOf/a5bdQ=';

const modelPath = 'C:\\Users\\x\\traquity\\ai\\models\\model-a.gguf';
const modelBytes = Buffer.from('stubbed gguf weights');
// sha256/hex digest of modelBytes above
const modelSha256 = 'c96848603fe64c2aa0c7855a5082cbaf32f2da0c5a9531db4994ec9b883da28b';

/** @type {Record<string, import('./catalogue.js').CatalogueRecord>} */
const STUB_CATALOGUE = {
  'model-a': {
    key: 'model-a',
    description: 'Model A',
    sizeBytes: modelBytes.length,
    license: 'Apache-2.0',
    repo: 'org/model-a',
    revision: 'abc123',
    file: 'model-a.gguf',
    sha256: modelSha256
  },
  'model-b': {
    key: 'model-b',
    description: 'Model B',
    sizeBytes: 42,
    license: 'Apache-2.0',
    repo: 'org/model-b',
    revision: 'def456',
    file: 'model-b.gguf',
    sha256: 'b'.repeat(64)
  }
};

const STUB_CATALOGUE_ENTRIES = Object.values(STUB_CATALOGUE).map(({key, description, sizeBytes, license}) =>
  ({key, description, sizeBytes, license}));

jest.mock('./catalogue.js', () => ({CATALOGUE: STUB_CATALOGUE, catalogueEntries: () => STUB_CATALOGUE_ENTRIES}));

const {createAiRegistry} = require('./ai-registry.js');

/** @import {AiRegistry, AiRegistryFileSystem} from './ai-registry.js' */
/** @import {ConfigFile} from '../config/config-file.js' */
/** @import {TraQuityConfig} from '../config/config-schema.js' */

describe('aiRegistry', () => {
  /** @type {TraQuityConfig} */
  let config;

  /** @type {Pick<ConfigFile, 'save'>} */
  let configFile;

  /** @type {AiRegistry} */
  let subjectUnderTest;

  const save = jest.fn();
  /** @type {jest.Mock<(path: string) => boolean>} */
  const existsSync = jest.fn(() => true);
  /** @type {jest.Mock<(path: string) => Buffer>} */
  const readFileSync = jest.fn(() => noticeBytes);
  /** @type {jest.Mock<(path: string) => NodeJS.ReadableStream>} */
  const createReadStream = jest.fn(() => Readable.from([modelBytes]));
  /** @type {jest.Mock<(path: string, options: {force: boolean}) => void>} */
  const rmSync = jest.fn(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(noticeBytes);
    createReadStream.mockReturnValue(Readable.from([modelBytes]));
    rmSync.mockReturnValue(undefined);

    config = {
      env: {},
      auth: {}
    };

    configFile = {save};

    /** @type {AiRegistryFileSystem} */
    const fileSystem = {existsSync, readFileSync, createReadStream, rmSync};

    subjectUnderTest = createAiRegistry({configFile, config, noticePath, fileSystem});
  });

  describe('with no ai key', () => {
    it('reports the notice as unconfirmed', () => {
      expect(subjectUnderTest.getState()).toMatchObject({isConfirmed: false});
    });

    it('returns the full catalogue', () => {
      const {catalogue} = subjectUnderTest.getState();

      expect(catalogue).toEqual(STUB_CATALOGUE_ENTRIES);
    });

    it('reports no installed models', () => {
      const {models} = subjectUnderTest.getState();

      expect(models).toEqual({});
    });

    it('persists the confirmed digest and an empty models map on a first confirm', () => {
      subjectUnderTest.confirm();

      expect(config.ai).toEqual({confirmedNotice: noticeDigest, models: {}});
    });

    it('saves the config it wrote the confirmation into', () => {
      subjectUnderTest.confirm();

      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({env: {}, auth: {}, ai: {confirmedNotice: noticeDigest, models: {}}});
    });

    it('hashes the packaged notice resource itself, accepting no payload', () => {
      subjectUnderTest.confirm();

      expect(readFileSync).toHaveBeenCalledTimes(1);
      expect(readFileSync).toHaveBeenCalledWith(noticePath);
      expect(config.ai?.confirmedNotice).toBe(noticeDigest);
    });
  });

  describe('with a confirmed notice and an installed model', () => {
    beforeEach(() => {
      config.ai = {confirmedNotice: noticeDigest, models: {'model-a': {path: modelPath, active: true}}};
    });

    it('returns the full catalogue', () => {
      const {catalogue} = subjectUnderTest.getState();

      expect(catalogue).toEqual(STUB_CATALOGUE_ENTRIES);
    });
  });

  describe('with a stored digest matching the packaged notice', () => {
    beforeEach(() => {
      config.ai = {confirmedNotice: noticeDigest};
    });

    it('reports the notice as confirmed', () => {
      expect(subjectUnderTest.getState()).toMatchObject({isConfirmed: true});
    });
  });

  describe('with a stored digest that does not match the packaged notice', () => {
    beforeEach(() => {
      config.ai = {confirmedNotice: 'this is not even base64 encoded'};
    });

    it('reports the notice as unconfirmed', () => {
      expect(subjectUnderTest.getState()).toMatchObject({isConfirmed: false});
    });
  });

  describe('confirming again once models are already installed', () => {
    beforeEach(() => {
      config.ai = {models: {'model-a': {path: modelPath, active: true}}};
    });

    it('keeps the installed models rather than wiping them', () => {
      subjectUnderTest.confirm();

      expect(config.ai).toEqual({
        confirmedNotice: 'MUFMUEmsOQhHvXx/CHHbvxdT39R2PCZE62SOf/a5bdQ=',
        models: {'model-a': {path: modelPath, active: true}}
      });
    });
  });

  describe('with a model whose file exists at the recorded path', () => {
    beforeEach(() => {
      config.ai = {models: {'model-a': {path: modelPath, active: true}}};
    });

    it('reports that model with its path and active flag', () => {
      const {models} = subjectUnderTest.getState();

      expect(models).toEqual({'model-a': {path: modelPath, active: true}});
    });

    it('reads no model file', () => {
      subjectUnderTest.getState();

      expect(createReadStream).not.toHaveBeenCalled();
    });
  });

  describe('with a model whose path does not exist', () => {
    beforeEach(() => {
      config.ai = {models: {'model-a': {path: modelPath, active: true}}};
      existsSync.mockReturnValue(false);
    });

    it('reports no entry for that model', () => {
      const {models} = subjectUnderTest.getState();

      expect(models).toEqual({});
      expect(createReadStream).not.toHaveBeenCalled();
    });
  });

  describe('with a model whose file no longer hashes to the catalogue digest', () => {
    beforeEach(() => {
      config.ai = {models: {'model-a': {path: modelPath, active: true}}};
      createReadStream.mockReturnValue(Readable.from([Buffer.from('tampered weights')]));
    });

    it('reports that model as installed, since reading state does not validate hashes', () => {
      const {models} = subjectUnderTest.getState();

      expect(models).toEqual({'model-a': {path: modelPath, active: true}});
    });
  });

  describe('with an entry for a key the catalogue does not carry', () => {
    beforeEach(() => {
      config.ai = {models: {'unknown-model': {path: modelPath, active: true}}};
    });

    it('reports no entry for that key', () => {
      const {models} = subjectUnderTest.getState();

      expect(models).toEqual({});
      expect(existsSync).not.toHaveBeenCalled();
      expect(createReadStream).not.toHaveBeenCalled();
    });
  });

  describe('install', () => {
    const newModelPath = 'D:\\downloads\\models\\model-a.gguf';

    beforeEach(() => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {}
      };
    });

    it('persists the path for the given key, defaulting active to false', () => {
      subjectUnderTest.install('model-a', newModelPath);

      expect(config.ai).toEqual({
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {
            path: newModelPath,
            active: false
          }
        }
      });

      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(config);
    });

    it('keeps other installed models untouched', () => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {
          'model-b': {path: modelPath, active: true}
        }
      };

      subjectUnderTest.install('model-a', newModelPath);

      expect(config.ai).toEqual({
        confirmedNotice: noticeDigest,
        models: {
          'model-b': {path: modelPath, active: true},
          'model-a': {path: newModelPath, active: false}
        }
      });
    });

    it('preserves the active flag of a repeated download for the same key', () => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: modelPath, active: true}
        }
      };

      subjectUnderTest.install('model-a', newModelPath);

      expect(config.ai).toEqual({
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: newModelPath, active: true}
        }
      });
    });

    it('treats a mangled prior entry for the same key as not active', () => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: modelPath}
        }
      };

      subjectUnderTest.install('model-a', newModelPath);

      expect(config.ai).toEqual({
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: newModelPath, active: false}
        }
      });
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {'model-a': {path: modelPath, active: true}}
      };
    });

    it('deletes the file and drops the entry on a matching digest', async () => {
      await expect(subjectUnderTest.remove('model-a')).resolves.toEqual({status: 'removed'});

      expect(rmSync).toHaveBeenCalledTimes(1);
      expect(rmSync).toHaveBeenCalledWith(modelPath, {force: true});
      expect(config.ai).toEqual({confirmedNotice: noticeDigest, models: {}});
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(config);
    });

    it('keeps other installed models untouched', async () => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: modelPath, active: true},
          'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf', active: false}
        }
      };

      await subjectUnderTest.remove('model-a');

      expect(config.ai).toEqual({
        confirmedNotice: noticeDigest,
        models: {'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf', active: false}}
      });
    });

    it('refuses an unknown catalogue key without touching disk or config', async () => {
      await expect(subjectUnderTest.remove('unknown-model')).resolves.toEqual({
        status: 'failed',
        message: 'No installed model for unknown-model'
      });

      expect(rmSync).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('refuses a key with no ai.models entry without touching disk or config', async () => {
      config.ai = {confirmedNotice: noticeDigest, models: {}};

      await expect(subjectUnderTest.remove('model-a')).resolves.toEqual({
        status: 'failed',
        message: 'No installed model for model-a'
      });

      expect(rmSync).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('refuses a key whose file does not exist without touching disk or config', async () => {
      existsSync.mockReturnValue(false);

      await expect(subjectUnderTest.remove('model-a')).resolves.toEqual({
        status: 'failed',
        message: 'No installed model for model-a'
      });

      expect(rmSync).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('refuses a key whose file digest does not match the catalogue without touching disk or config', async () => {
      createReadStream.mockReturnValue(Readable.from([Buffer.from('tampered weights')]));

      await expect(subjectUnderTest.remove('model-a')).resolves.toEqual({
        status: 'failed',
        message: 'Installed model for model-a failed digest verification'
      });

      expect(rmSync).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('reports a failed deletion and leaves the entry in place', async () => {
      rmSync.mockImplementation(() => {
        throw new Error('EBUSY: resource busy or locked');
      });

      await expect(subjectUnderTest.remove('model-a')).resolves.toEqual({
        status: 'failed',
        message: 'EBUSY: resource busy or locked'
      });

      expect(config.ai).toEqual({confirmedNotice: noticeDigest, models: {'model-a': {path: modelPath, active: true}}});
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    beforeEach(() => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: modelPath, active: false},
          'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf', active: true}
        }
      };
    });

    it('marks the given key active and clears every other entry\'s flag', () => {
      expect(subjectUnderTest.activate('model-a')).toEqual({status: 'activated'});

      expect(config.ai).toEqual({
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: modelPath, active: true},
          'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf', active: false}
        }
      });
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(config);
    });

    it('leaves an already active key active on repeat activation', () => {
      subjectUnderTest.activate('model-b');

      expect(config.ai).toEqual({
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: modelPath, active: false},
          'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf', active: true}
        }
      });
    });

    it('refuses an unknown catalogue key without touching disk or config', () => {
      expect(subjectUnderTest.activate('unknown-model')).toEqual({
        status: 'failed',
        message: 'No installed model for unknown-model'
      });

      expect(save).not.toHaveBeenCalled();
    });

    it('refuses a key with no ai.models entry without touching the config', () => {
      config.ai = {confirmedNotice: noticeDigest, models: {}};

      expect(subjectUnderTest.activate('model-a')).toEqual({
        status: 'failed',
        message: 'No installed model for model-a'
      });

      expect(save).not.toHaveBeenCalled();
    });

    it('refuses a hand-added entry for a key outside the catalogue without touching the config', () => {
      config.ai = {confirmedNotice: noticeDigest, models: {'rogue-model': {path: modelPath, active: false}}};

      expect(subjectUnderTest.activate('rogue-model')).toEqual({
        status: 'failed',
        message: 'No installed model for rogue-model'
      });

      expect(save).not.toHaveBeenCalled();
    });

    it('refuses a mangled entry for the given key without touching the config', () => {
      config.ai = {confirmedNotice: noticeDigest, models: {'model-a': {path: modelPath}}};

      expect(subjectUnderTest.activate('model-a')).toEqual({
        status: 'failed',
        message: 'No installed model for model-a'
      });

      expect(save).not.toHaveBeenCalled();
    });

    it('passes through a mangled entry for another key unchanged', () => {
      config.ai = {
        confirmedNotice: noticeDigest,
        models: {
          'model-a': {path: modelPath, active: false},
          'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf'}
        }
      };

      subjectUnderTest.activate('model-a');

      expect(config.ai?.models).toEqual({
        'model-a': {path: modelPath, active: true},
        'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf'}
      });
    });

    it('does not require a confirmed notice to activate a key', () => {
      config.ai = {models: {'model-a': {path: modelPath, active: false}}};

      expect(subjectUnderTest.activate('model-a')).toEqual({status: 'activated'});

      expect(config.ai).toEqual({models: {'model-a': {path: modelPath, active: true}}});
    });
  });

  describe('with a mangled entry for one model alongside a valid entry for another', () => {
    beforeEach(() => {
      config.ai = {
        models: {
          'model-a': {path: modelPath, active: true},
          // missing `active` - fails `modelEntrySchema` and must not affect model-a's own entry
          'model-b': {path: 'C:\\Users\\x\\traquity\\ai\\models\\model-b.gguf'}
        }
      };
    });

    it('reports no entry for the mangled key and the valid entry for the other', () => {
      const {models} = subjectUnderTest.getState();

      expect(models).toEqual({'model-a': {path: modelPath, active: true}});
      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith(modelPath);
    });
  });
});
