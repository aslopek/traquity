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

  beforeEach(() => {
    jest.clearAllMocks();
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(noticeBytes);
    createReadStream.mockReturnValue(Readable.from([modelBytes]));

    config = {
      env: {},
      auth: {}
    };

    configFile = {save};

    /** @type {AiRegistryFileSystem} */
    const fileSystem = {existsSync, readFileSync, createReadStream};

    subjectUnderTest = createAiRegistry({configFile, config, noticePath, fileSystem});
  });

  describe('with no ai key', () => {
    it('reports the notice as unconfirmed', async () => {
      await expect(subjectUnderTest.getState()).resolves.toMatchObject({isConfirmed: false});
    });

    it('returns the full catalogue', async () => {
      const {catalogue} = await subjectUnderTest.getState();

      expect(catalogue).toEqual(STUB_CATALOGUE_ENTRIES);
    });

    it('reports no installed models', async () => {
      const {models} = await subjectUnderTest.getState();

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

    it('returns the full catalogue', async () => {
      const {catalogue} = await subjectUnderTest.getState();

      expect(catalogue).toEqual(STUB_CATALOGUE_ENTRIES);
    });
  });

  describe('with a stored digest matching the packaged notice', () => {
    beforeEach(() => {
      config.ai = {confirmedNotice: noticeDigest};
    });

    it('reports the notice as confirmed', async () => {
      await expect(subjectUnderTest.getState()).resolves.toMatchObject({isConfirmed: true});
    });
  });

  describe('with a stored digest that does not match the packaged notice', () => {
    beforeEach(() => {
      config.ai = {confirmedNotice: 'this is not even base64 encoded'};
    });

    it('reports the notice as unconfirmed', async () => {
      await expect(subjectUnderTest.getState()).resolves.toMatchObject({isConfirmed: false});
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

  describe('with a model whose file matches the catalogue digest', () => {
    beforeEach(() => {
      config.ai = {models: {'model-a': {path: modelPath, active: true}}};
    });

    it('reports that model with its path and active flag', async () => {
      const {models} = await subjectUnderTest.getState();

      expect(models).toEqual({'model-a': {path: modelPath, active: true}});
    });

    it('digests the file at the entry\'s own path', async () => {
      await subjectUnderTest.getState();

      expect(createReadStream).toHaveBeenCalledTimes(1);
      expect(createReadStream).toHaveBeenCalledWith(modelPath);
    });
  });

  describe('with a model whose path does not exist', () => {
    beforeEach(() => {
      config.ai = {models: {'model-a': {path: modelPath, active: true}}};
      existsSync.mockReturnValue(false);
    });

    it('reports no entry for that model', async () => {
      const {models} = await subjectUnderTest.getState();

      expect(models).toEqual({});
      expect(createReadStream).not.toHaveBeenCalled();
    });
  });

  describe('with a model whose file digest does not match the catalogue', () => {
    beforeEach(() => {
      config.ai = {models: {'model-a': {path: modelPath, active: true}}};
      createReadStream.mockReturnValue(Readable.from([Buffer.from('tampered weights')]));
    });

    it('reports no entry for that model', async () => {
      const {models} = await subjectUnderTest.getState();

      expect(models).toEqual({});
    });
  });

  describe('with an entry for a key the catalogue does not carry', () => {
    beforeEach(() => {
      config.ai = {models: {'unknown-model': {path: modelPath, active: true}}};
    });

    it('reports no entry for that key', async () => {
      const {models} = await subjectUnderTest.getState();

      expect(models).toEqual({});
      expect(existsSync).not.toHaveBeenCalled();
      expect(createReadStream).not.toHaveBeenCalled();
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

    it('reports no entry for the mangled key and the valid entry for the other', async () => {
      const {models} = await subjectUnderTest.getState();

      expect(models).toEqual({'model-a': {path: modelPath, active: true}});
      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith(modelPath);
      expect(createReadStream).toHaveBeenCalledTimes(1);
      expect(createReadStream).toHaveBeenCalledWith(modelPath);
    });
  });
});
