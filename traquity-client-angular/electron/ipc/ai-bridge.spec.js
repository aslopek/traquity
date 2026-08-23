const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createAiBridge} = require('./ai-bridge.js');

/** @import {IpcMainLike} from './trusted-channels.js' */
/** @import {AiRegistry, AiState} from '../ai/ai-registry.js' */
/** @import {AiDialogs} from '../window/ai-dialogs.js' */
/** @import {AiDownloadProgress, ModelDownloadResult} from '../ai/model-download.js' */
/** @import {CatalogueRecord} from '../ai/catalogue.js' */
/** @import {ProgressWindowLike} from './ai-bridge.js' */

describe('aiBridge', () => {
  const modelDirectory = 'D:\\downloads\\models';
  const modelPath = 'D:\\downloads\\models\\model-a.gguf';

  /** @type {Record<string, CatalogueRecord>} */
  const catalogue = {
    'model-a': {
      key: 'model-a',
      description: 'Model A',
      sizeBytes: 1_000_000_000,
      license: 'Apache-2.0',
      repo: 'org/model-a',
      revision: 'abc123',
      file: 'model-a.gguf',
      sha256: 'a'.repeat(64)
    }
  };

  const handle = jest.fn(/** @type {IpcMainLike['handle']} */ (() => {
  }));
  const on = jest.fn(/** @type {IpcMainLike['on']} */ (() => {
  }));
  const getAiState = jest.fn(/** @type {() => Promise<AiState>} */ (() => Promise.resolve(aiState)));
  const confirmAi = jest.fn(/** @type {() => void} */ (() => undefined));
  const installAi = jest.fn(/** @type {(key: string, modelPath: string) => void} */ (() => undefined));
  const pickDownloadDirectory = jest.fn(/** @type {AiDialogs['pickDownloadDirectory']} */
    (() => Promise.resolve(modelDirectory)));
  const hasEnoughFreeSpace = jest.fn(/** @type {(directory: string, requiredBytes: number) => boolean} */ (() => true));
  const downloadModel = jest.fn(
    /** @type {(entry: CatalogueRecord, targetDirectory: string, onProgress: (progress: AiDownloadProgress) => void) =>
     *   Promise<ModelDownloadResult>} */
    (() => Promise.resolve({status: 'completed', path: modelPath})));
  const isTrustedSender = jest.fn(/** @type {(event: unknown) => boolean} */ (() => true));
  const send = jest.fn(/** @type {ProgressWindowLike['webContents']['send']} */ (() => undefined));
  const getMainWindow = jest.fn(/** @type {() => ProgressWindowLike | null} */ (() => ({webContents: {send}})));

  /** @type {AiState} */
  let aiState;

  /** @type {IpcMainLike} */
  let ipcMain;

  /** @type {Pick<AiRegistry, 'getState' | 'confirm' | 'install'>} */
  let aiRegistry;

  /** @type {Pick<AiDialogs, 'pickDownloadDirectory'>} */
  let aiDialogs;

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
   * @returns {void}
   */
  function createBridge() {
    createAiBridge({
      ipcMain,
      aiRegistry,
      catalogue,
      aiDialogs,
      downloadModel,
      hasEnoughFreeSpace,
      getMainWindow,
      tlsOverridden,
      isTrustedSender
    }).register();
  }

  beforeEach(() => {
    aiState = {isConfirmed: false, catalogue: [], models: {}};

    jest.clearAllMocks();
    getAiState.mockResolvedValue(aiState);
    pickDownloadDirectory.mockResolvedValue(modelDirectory);
    hasEnoughFreeSpace.mockReturnValue(true);
    downloadModel.mockResolvedValue({status: 'completed', path: modelPath});
    getMainWindow.mockReturnValue({webContents: {send}});
    isTrustedSender.mockReturnValue(true);
    tlsOverridden = false;

    ipcMain = {handle, on};
    aiRegistry = {getState: getAiState, confirm: confirmAi, install: installAi};
    aiDialogs = {pickDownloadDirectory};

    createBridge();
  });

  it('registers exactly the three request/response channels via handle', () => {
    expect(handle.mock.calls.map(([channel]) => channel)).toEqual(['ai:getState', 'ai:confirm', 'ai:download']);
  });

  it('registers no one-way channel', () => {
    expect(on).not.toHaveBeenCalled();
  });

  it('resolves ai:getState with the registry\'s own state', async () => {
    await expect(handleListenerFor('ai:getState')(undefined)).resolves.toBe(aiState);
  });

  it('delegates ai:confirm to the registry, taking no argument off the renderer', () => {
    handleListenerFor('ai:confirm')(undefined);

    expect(confirmAi).toHaveBeenCalledTimes(1);
    expect(confirmAi).toHaveBeenCalledWith();
  });

  describe('ai:download', () => {
    it('picks a directory, downloads into it and installs the completed result', async () => {
      await expect(handleListenerFor('ai:download')(undefined, 'model-a')).resolves.toEqual({status: 'completed'});

      expect(pickDownloadDirectory).toHaveBeenCalledTimes(1);
      expect(pickDownloadDirectory).toHaveBeenCalledWith();
      expect(downloadModel).toHaveBeenCalledTimes(1);
      expect(downloadModel).toHaveBeenCalledWith(/** @type {CatalogueRecord} */ (catalogue['model-a']), modelDirectory, expect.any(Function));
      expect(installAi).toHaveBeenCalledTimes(1);
      expect(installAi).toHaveBeenCalledWith('model-a', modelPath);
    });

    it('rejects an unknown catalogue key without opening a dialog', async () => {
      await expect(handleListenerFor('ai:download')(undefined, 'unknown-model')).rejects.toThrow('Unknown catalogue key unknown-model');
      expect(pickDownloadDirectory).not.toHaveBeenCalled();
    });

    it('rejects a non-string key without opening a dialog', async () => {
      await expect(handleListenerFor('ai:download')(undefined, 42)).rejects.toThrow('Invalid key argument for ai:download');
      expect(pickDownloadDirectory).not.toHaveBeenCalled();
    });

    it('reports a cancelled pick without downloading or installing anything', async () => {
      pickDownloadDirectory.mockResolvedValue(null);

      await expect(handleListenerFor('ai:download')(undefined, 'model-a')).resolves.toEqual({status: 'cancelled'});
      expect(downloadModel).not.toHaveBeenCalled();
      expect(installAi).not.toHaveBeenCalled();
    });

    it('checks free space for the picked directory against the entry\'s size plus one gibibyte', async () => {
      await handleListenerFor('ai:download')(undefined, 'model-a');

      expect(hasEnoughFreeSpace).toHaveBeenCalledTimes(1);
      const modelA = /** @type {CatalogueRecord} */ (catalogue['model-a']);
      const expectedMargin = 2 ** 30; // one gigabyte
      expect(hasEnoughFreeSpace).toHaveBeenCalledWith(modelDirectory, modelA.sizeBytes + expectedMargin);
    });

    it('fails on insufficient free space without downloading or installing anything', async () => {
      hasEnoughFreeSpace.mockReturnValue(false);

      await expect(handleListenerFor('ai:download')(undefined, 'model-a')).resolves.toEqual({
        status: 'failed',
        message: 'Not enough free disk space in the selected folder'
      });
      expect(downloadModel).not.toHaveBeenCalled();
      expect(installAi).not.toHaveBeenCalled();
    });

    it('returns a failed download unchanged without installing anything', async () => {
      downloadModel.mockResolvedValue({status: 'failed', message: 'Hash verification failed'});

      await expect(handleListenerFor('ai:download')(undefined, 'model-a')).resolves.toEqual({
        status: 'failed',
        message: 'Hash verification failed'
      });
      expect(installAi).not.toHaveBeenCalled();
    });

    it('sends progress events to the main window', async () => {
      /** @type {AiDownloadProgress} */
      const progress = {phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1};
      downloadModel.mockImplementation((_entry, _targetDirectory, onProgress) => {
        onProgress(progress);
        return Promise.resolve({status: 'completed', path: modelPath});
      });

      await handleListenerFor('ai:download')(undefined, 'model-a');

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('ai:downloadProgress', progress);
    });

    it('sends no progress when the window is gone', async () => {
      getMainWindow.mockReturnValue(null);
      downloadModel.mockImplementation((_entry, _targetDirectory, onProgress) => {
        onProgress({phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1});
        return Promise.resolve({status: 'completed', path: modelPath});
      });

      await handleListenerFor('ai:download')(undefined, 'model-a');

      expect(send).not.toHaveBeenCalled();
    });

    it('refuses a second download while one is running, without opening a second dialog', async () => {
      /** @type {() => void} */
      let finishFirstDownload = () => undefined;
      downloadModel.mockImplementation(() => new Promise(resolve => {
        finishFirstDownload = () => resolve({status: 'failed', message: 'HTTP 503'});
      }));

      const firstDownload = handleListenerFor('ai:download')(undefined, 'model-a');

      await expect(handleListenerFor('ai:download')(undefined, 'model-a')).resolves.toEqual({
        status: 'failed',
        message: 'A model download is already running'
      });
      expect(pickDownloadDirectory).toHaveBeenCalledTimes(1);
      expect(downloadModel).toHaveBeenCalledTimes(1);

      finishFirstDownload();
      await firstDownload;
    });

    it('allows a further download once the running one has ended', async () => {
      downloadModel.mockResolvedValue({status: 'failed', message: 'HTTP 503'});
      await handleListenerFor('ai:download')(undefined, 'model-a');

      await expect(handleListenerFor('ai:download')(undefined, 'model-a')).resolves.toEqual({
        status: 'failed',
        message: 'HTTP 503'
      });
      expect(downloadModel).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the sender is refused', () => {
    /** @type {{senderFrame: string}} an event stood in for by the one member the decision is made on */
    let event;

    beforeEach(() => {
      event = {senderFrame: 'a frame that is not the main one'};
      isTrustedSender.mockReturnValue(false);
    });

    it('refuses ai:confirm without writing anything', () => {
      expect(() => handleListenerFor('ai:confirm')(event))
        .toThrow('Refused ai:confirm from an untrusted sender');
      expect(confirmAi).not.toHaveBeenCalled();
      expect(isTrustedSender).toHaveBeenCalledTimes(1);
      expect(isTrustedSender).toHaveBeenCalledWith(event);
    });

    it('refuses ai:download before its key is parsed, opening no dialog', () => {
      expect(() => handleListenerFor('ai:download')(event, 'model-a'))
        .toThrow('Refused ai:download from an untrusted sender');
      expect(pickDownloadDirectory).not.toHaveBeenCalled();
      expect(isTrustedSender).toHaveBeenCalledTimes(1);
      expect(isTrustedSender).toHaveBeenCalledWith(event);
    });
  });

  describe('when TLS verification is overridden', () => {
    beforeEach(() => {
      tlsOverridden = true;
      jest.clearAllMocks();
      createBridge();
    });

    it('registers no channel at all', () => {
      expect(handle).not.toHaveBeenCalled();
      expect(on).not.toHaveBeenCalled();
    });
  });
});
