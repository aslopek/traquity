/** @import {BackendProcess} from '../backend/backend-process.js' */
/** @import {ConfigureOnNextStart} from '../config/configure-on-next-start.js' */

/**
 * @typedef {Object} RestartIntoConfigurationOptions
 * @property {Pick<ConfigureOnNextStart, 'request'>} configureOnNextStart
 * @property {Pick<BackendProcess, 'stop'>} backendProcess
 * @property {Pick<import('electron').App, 'relaunch' | 'exit'>} app
 */

/** @typedef {{restart: () => Promise<void>}} RestartIntoConfiguration */

/**
 * @param {RestartIntoConfigurationOptions} options
 * @returns {RestartIntoConfiguration}
 */
function createRestartIntoConfiguration(options) {
  const {configureOnNextStart, backendProcess, app} = options;

  /**
   * `app.exit(0)` does not fire `window-all-closed`, so the backend is stopped here, before it, or the relaunched
   * instance finds the old one still holding the port and the H2 file. The relaunch waits for that shutdown: a
   * backend killed mid-write loses what MVStore had not flushed.
   *
   * @returns {Promise<void>}
   */
  async function restart() {
    configureOnNextStart.request();
    await backendProcess.stop();
    app.relaunch();
    app.exit(0);
  }

  return {restart};
}

module.exports = {createRestartIntoConfiguration};
