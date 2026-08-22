const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createAiDialogs} = require('./ai-dialogs.js');

/** @import {AiDialogs, OpenDialogLike} from './ai-dialogs.js' */

/**
 * Stands in for the `BrowserWindow` the dialog is parented to. The module hands it straight back to the injected
 * dialog and never reads a member of it, which is exactly why its type is a parameter.
 *
 * @typedef {{label: string}} TestWindow
 */

describe('aiDialogs', () => {
  const pickedDirectory = 'D:\\downloads\\models';

  /** @type {TestWindow} */
  let parentWindow;

  /** @type {TestWindow | null} */
  let window;

  /** @type {AiDialogs} */
  let dialogs;

  const showOpenDialog = jest.fn(/** @type {OpenDialogLike<TestWindow>['showOpenDialog']} */
    (() => Promise.resolve({canceled: false, filePaths: [pickedDirectory]})));

  beforeEach(() => {
    parentWindow = {label: 'main'};
    jest.clearAllMocks();
    showOpenDialog.mockResolvedValue({canceled: false, filePaths: [pickedDirectory]});
    window = parentWindow;

    /** @type {OpenDialogLike<TestWindow>} */
    const dialog = {showOpenDialog};

    dialogs = createAiDialogs({dialog, getParentWindow: () => window});
  });

  it('returns the picked directory', async () => {
    await expect(dialogs.pickDownloadDirectory()).resolves.toBe(pickedDirectory);
  });

  it('opens a directory-only picker parented to the main window', async () => {
    await dialogs.pickDownloadDirectory();

    expect(showOpenDialog).toHaveBeenCalledTimes(1);
    expect(showOpenDialog).toHaveBeenCalledWith(parentWindow, {
      title: 'Choose a folder to download the model into',
      properties: ['openDirectory', 'createDirectory']
    });
  });

  it('returns null when the dialog is cancelled', async () => {
    showOpenDialog.mockResolvedValue({canceled: true, filePaths: []});

    await expect(dialogs.pickDownloadDirectory()).resolves.toBeNull();
  });

  it('returns null when the dialog yields no path', async () => {
    showOpenDialog.mockResolvedValue({canceled: false, filePaths: []});

    await expect(dialogs.pickDownloadDirectory()).resolves.toBeNull();
  });

  it('opens no dialog without a main window', async () => {
    window = null;

    await expect(dialogs.pickDownloadDirectory()).resolves.toBeNull();
    expect(showOpenDialog).not.toHaveBeenCalled();
  });
});
