/**
 * The native directory picker for choosing where a model download lands. Mirrors `java-dialogs.js`/`database-dialogs.js`:
 * `dialog` and the main window are injected, so this module is exercisable without an Electron instance, and no
 * dialog opens without a parent window to attach to and return a selection to.
 */

/**
 * Electron's `dialog`, narrowed to the one call made here.
 *
 * @template TWindow
 * @typedef {Object} OpenDialogLike
 * @property {(window: TWindow, options: import('electron').OpenDialogOptions) =>
 *   Promise<import('electron').OpenDialogReturnValue>} showOpenDialog
 */

/**
 * @typedef {Object} AiDialogs
 * @property {() => Promise<string | null>} pickDownloadDirectory
 */

/**
 * @template TWindow
 * @typedef {Object} AiDialogsOptions
 * @property {OpenDialogLike<TWindow>} dialog
 * @property {() => TWindow | null} getParentWindow the window a dialog is parented to; without one there is nothing
 *   to parent to and nothing to return a selection to, so no dialog opens
 */

/**
 * @template TWindow
 * @param {AiDialogsOptions<TWindow>} options
 * @returns {AiDialogs}
 */
function createAiDialogs(options) {
  const {dialog, getParentWindow} = options;

  /**
   * @returns {Promise<string | null>}
   */
  async function pickDownloadDirectory() {
    const parentWindow = getParentWindow();
    if (parentWindow == null) {
      return null;
    }

    /** @type {import('electron').OpenDialogOptions} */
    const dialogOptions = {
      title: 'Choose a folder to download the model into',
      properties: ['openDirectory', 'createDirectory']
    };

    const {canceled, filePaths} = await dialog.showOpenDialog(parentWindow, dialogOptions);
    const filePath = filePaths[0];
    return canceled || filePath == null ? null : filePath;
  }

  return {pickDownloadDirectory};
}

module.exports = {createAiDialogs};
