/**
 * Whether an IPC event may be served at all, decided before its channel's own argument schema is even consulted.
 *
 * `ipcMain.handle`/`ipcMain.on` register per channel, not per frame: every frame that has the preload's bridge reaches
 * every channel registered on that channel name, and an `event` is the only thing that says which frame that was. The
 * answer here is therefore an identity comparison - a URL is a string the sender influences,
 * while the main frame of the app's own window is an object this process created itself.
 */

/**
 * The one member of an `IpcMainInvokeEvent`/`IpcMainEvent` this decision reads. `senderFrame` is `null` for a frame
 * that was already torn down by the time the event is handled.
 *
 * @typedef {Object} IpcEventLike
 * @property {unknown} senderFrame
 */

/**
 * The window's main frame, as the object identity to compare against. Declared as `unknown` for the same reason the
 * event is: nothing here touches a member of it.
 *
 * @typedef {Object} MainFrameHolder
 * @property {{mainFrame: unknown}} webContents
 */

/**
 * @param {unknown} value
 * @returns {value is IpcEventLike}
 */
function carriesSenderFrame(value) {
  return typeof value === 'object' && value !== null && 'senderFrame' in value;
}

/**
 * Whether `event` came from the main frame of `window`. False whenever there is no window, no event, or no frame to
 * compare - a refusal is the only safe answer to an event whose origin cannot be established.
 *
 * @param {unknown} event
 * @param {MainFrameHolder | null} window
 * @returns {boolean}
 */
function isTrustedSender(event, window) {
  if (window == null || !carriesSenderFrame(event)) {
    return false;
  }
  const senderFrame = event.senderFrame;
  return senderFrame != null && senderFrame === window.webContents.mainFrame;
}

module.exports = {isTrustedSender};
