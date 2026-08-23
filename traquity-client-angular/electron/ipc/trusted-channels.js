/**
 * The channel-registration mechanics shared by every IPC bridge module in this directory: a request/response
 * registration that refuses an untrusted sender by throwing, and a one-way registration that drops one instead, since
 * there is no answer to reject.
 */

/**
 * `require('electron')` is not loadable under jest (`testEnvironment: 'node'`), so no module in `electron/ipc/` may
 * import it. Electron's real `ipcMain` is structurally assignable to this minimal shape.
 *
 * @typedef {Object} IpcMainLike
 * @property {(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => void} handle
 * @property {(channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void} on
 */

/**
 * @typedef {Object} TrustedChannelsOptions
 * @property {IpcMainLike} ipcMain
 * @property {(event: unknown) => boolean} isTrustedSender whether an IPC event's sender may be served at all
 */

/**
 * @typedef {Object} TrustedChannels
 * @property {(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => void} handle
 * @property {(channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void} on
 */

/**
 * @param {TrustedChannelsOptions} options
 * @returns {TrustedChannels}
 */
function createTrustedChannels(options) {
  const {ipcMain, isTrustedSender} = options;

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
   * Registers a one-way channel. An untrusted sender is dropped, not reported: there is no answer to reject.
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

  return {handle, on};
}

module.exports = {createTrustedChannels};
