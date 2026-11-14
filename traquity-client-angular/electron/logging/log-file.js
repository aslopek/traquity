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
 * @property {() => string} [now] the timestamp each entry starts with
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
 * Formats a date in the machine's local time zone with its offset, e.g. `2026-08-29T11:20:00.000+02:00`.
 *
 * @param {Date} date
 * @returns {string}
 */
function formatLocalTimestamp(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const localTime = new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, -1);
  const offset = new Date(Math.abs(offsetMinutes) * 60_000).toISOString().slice(11, 16);
  return `${localTime}${offsetMinutes < 0 ? '-' : '+'}${offset}`;
}

/**
 * @param {LogFileOptions} options
 * @returns {LogFile}
 */
function createLogFile(options) {
  const {fileSystem, logPath} = options;
  const now = options.now ?? (() => formatLocalTimestamp(new Date()));
  const logger = options.logger ?? console;

  /**
   * @param {string} message may span several lines; it is written as given
   * @returns {void}
   */
  function write(message) {
    try {
      fileSystem.appendFileSync(logPath, `${now()} ${message}\n`, {mode: LOG_FILE_MODE});
    } catch (error) {
      logger.error(`Failed to write to ${logPath}:`, error);
    }
  }

  return {write};
}

module.exports = {createLogFile};
