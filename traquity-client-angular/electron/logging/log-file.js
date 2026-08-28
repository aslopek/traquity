/**
 * The app's own log file, one entry per call, appended synchronously.
 */

/**
 * The subset of `fs` this needs - declared minimally.
 *
 * @typedef {Object} LogFileSystem
 * @property {(path: string, data: string, options: {mode: number}) => void} appendFileSync
 */

/**
 * @typedef {Object} LogFileOptions
 * @property {LogFileSystem} fileSystem
 * @property {string} logPath
 * @property {() => Date} [now] the clock each entry is timestamped from
 * @property {Pick<Console, 'error'>} [logger]
 */

/**
 * @typedef {Object} LogFile
 * @property {(message: string) => void} write
 */

/**
 * The mode the log file is created with: readable and writable by its owner only. Logs may contain sensitive data.
 *
 * @type {number}
 */
const LOG_FILE_MODE = 0o600;

/**
 * @param {LogFileOptions} options
 * @returns {LogFile}
 */
function createLogFile(options) {
  const {fileSystem, logPath} = options;
  const now = options.now ?? (() => new Date());
  const logger = options.logger ?? console;

  /**
   * @param {string} message may span several lines; it is written as given
   * @returns {void}
   */
  function write(message) {
    try {
      fileSystem.appendFileSync(logPath, `${now().toISOString()} ${message}\n`, {mode: LOG_FILE_MODE});
    } catch (error) {
      logger.error(`Failed to write to ${logPath}:`, error);
    }
  }

  return {write};
}

module.exports = {createLogFile};
