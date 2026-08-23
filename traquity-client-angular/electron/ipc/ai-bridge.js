const {aiModelKeySchema} = require('./ipc-schema.js');
const {createTrustedChannels} = require('./trusted-channels.js');

/** @import {IpcMainLike} from './trusted-channels.js' */
/** @import {AiRegistry, AiState} from '../ai/ai-registry.js' */
/** @import {AiDialogs} from '../window/ai-dialogs.js' */
/** @import {AiDownloadProgress, ModelDownloadResult} from '../ai/model-download.js' */
/** @import {CatalogueRecord} from '../ai/catalogue.js' */

/**
 * Registers the `ai:*` IPC channels. `ai:downloadProgress` is the one push this module makes into the renderer, sent
 * straight to the window that invoked `ai:download`.
 *
 * `ai:confirm` sets `ai.confirmedNotice` (and `ai.models`, the first time) through `aiRegistry.confirm`,
 * `ai:download` sets one `ai.models` entry on a completed download through `aiRegistry.install`, and `ai:remove`
 * drops one `ai.models` entry and deletes its file through `aiRegistry.remove` - the three writes this module makes
 * to `traquity.config.json`.
 *
 * A TLS-overridden environment registers none of these channels: "nothing can be done" is then enforced by
 * architecture instead of left to each handler to refuse.
 *
 * Every channel is registered behind `isTrustedSender`.
 */

/**
 * The one member `ai:download` needs off the main window, to push progress to exactly the renderer that asked for it.
 *
 * @typedef {Object} ProgressWindowLike
 * @property {{send: (channel: string, progress: AiDownloadProgress) => void}} webContents
 */

/**
 * What `ai:download` answers with. `cancelled` is its own status and differs from `failed`: dismissing the
 * directory picker without choosing anything is not an error and the renderer shows no message for it, while every
 * other way the flow can end - not enough free space, a byte cap or hash mismatch, a transfer failure - is a
 * `failed` with a message to display. A `completed` outcome carries no path: the model this installed is read back
 * through `ai:getState`.
 *
 * @typedef {{status: 'completed' | 'cancelled'} | {status: 'failed', message: string}} AiDownloadOutcome
 */

/**
 * @typedef {Object} AiBridgeOptions
 * @property {IpcMainLike} ipcMain
 * @property {Pick<AiRegistry, 'getState' | 'confirm' | 'install' | 'remove'>} aiRegistry
 * @property {Record<string, CatalogueRecord>} catalogue the models, for resolving `ai:download`'s key argument
 * @property {Pick<AiDialogs, 'pickDownloadDirectory'>} aiDialogs
 * @property {(entry: CatalogueRecord, targetDirectory: string, onProgress: (progress: AiDownloadProgress) => void) =>
 *   Promise<ModelDownloadResult>} downloadModel
 * @property {(directory: string, requiredBytes: number) => boolean} hasEnoughFreeSpace
 * @property {() => ProgressWindowLike | null} getMainWindow
 * @property {boolean} tlsOverridden
 * @property {(event: unknown) => boolean} isTrustedSender whether an IPC event's sender may be served at all
 */

/** @type {number} the margin added on top of a model's exact catalogued size before its download starts */
const MARGIN_BYTES = 2 ** 30;

/**
 * @param {AiBridgeOptions} options
 * @returns {{register: () => void}}
 */
function createAiBridge(options) {
  const {
    ipcMain,
    aiRegistry,
    catalogue,
    aiDialogs,
    downloadModel,
    hasEnoughFreeSpace,
    getMainWindow,
    tlsOverridden,
    isTrustedSender
  } = options;

  const {handle} = createTrustedChannels({ipcMain, isTrustedSender});

  /** @type {boolean} set for as long as a download runs, so `ai:download` stays single-flight whatever the renderer does */
  let downloading = false;

  /**
   * @returns {void}
   */
  function register() {
    if (tlsOverridden) {
      return;
    }

    handle('ai:getState', () => aiRegistry.getState());

    handle('ai:confirm', () => aiRegistry.confirm());

    handle('ai:download', async (_event, key) => {
      const parsedKey = aiModelKeySchema.safeParse(key);
      if (!parsedKey.success) {
        throw new Error('Invalid key argument for ai:download');
      }
      const entry = catalogue[parsedKey.data];
      if (entry == null) {
        throw new Error(`Unknown catalogue key ${parsedKey.data}`);
      }

      // checked and set synchronously, before any `await` - a second call arriving while the first is still waiting
      // on the directory dialog must see this already set, not just a second call arriving once a transfer is
      // already streaming
      if (downloading) {
        return {status: 'failed', message: 'A model download is already running'};
      }
      downloading = true;

      try {
        const targetDirectory = await aiDialogs.pickDownloadDirectory();
        if (targetDirectory == null) {
          return {status: 'cancelled'};
        }

        if (!hasEnoughFreeSpace(targetDirectory, entry.sizeBytes + MARGIN_BYTES)) {
          return {status: 'failed', message: 'Not enough free disk space in the selected folder'};
        }

        const result = await downloadModel(entry, targetDirectory, progress => {
          const window = getMainWindow();
          if (window != null) {
            window.webContents.send('ai:downloadProgress', progress);
          }
        });

        if (result.status !== 'completed') {
          return result;
        }
        aiRegistry.install(entry.key, result.path);
        return {status: 'completed'};
      } finally {
        downloading = false;
      }
    });

    handle('ai:remove', async (_event, key) => {
      const parsedKey = aiModelKeySchema.safeParse(key);
      if (!parsedKey.success) {
        throw new Error('Invalid key argument for ai:remove');
      }
      return aiRegistry.remove(parsedKey.data);
    });
  }

  return {register};
}

module.exports = {createAiBridge};
