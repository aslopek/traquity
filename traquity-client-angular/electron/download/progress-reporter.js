/**
 * Throttled, rate-averaged progress reporting for a download's `downloading` phase - agnostic of what is being
 * downloaded, and of every phase around it (a caller's own `verifying`/`extracting` events are none of this
 * module's business and are never routed through it).
 */

/** @type {number} how often a downloading-phase progress event is pushed, at most */
const EMIT_INTERVAL_MILLIS = 200;
/** @type {number} the rolling window the download speed is averaged over */
const SPEED_WINDOW_MILLIS = 5_000;

/**
 * @typedef {Object} DownloadingProgress
 * @property {'downloading'} phase
 * @property {number} receivedBytes
 * @property {number | null} totalBytes null when the total is unknown (e.g. a missing `content-length`)
 * @property {number} bytesPerSecond a rolling average over the last few seconds
 * @property {number | null} secondsRemaining null whenever `totalBytes` is null or nothing has been received yet
 */

/**
 * @typedef {Object} ProgressReporter
 * @property {(chunkLength: number) => void} addBytes
 * @property {() => void} flush emits one final event unconditionally, bypassing the throttle
 */

/**
 * @param {{now: () => number, totalBytes: number | null, onProgress: (progress: DownloadingProgress) => void}} options
 * @returns {ProgressReporter}
 */
function createProgressReporter(options) {
  const {now, totalBytes, onProgress} = options;

  /** @type {number} */
  let receivedBytes = 0;
  /** @type {{time: number, receivedBytes: number}[]} */
  const samples = [];
  let lastEmitTime = -Infinity;

  /**
   * @param {number} currentTime
   * @returns {number}
   */
  function currentSpeed(currentTime) {
    const oldest = samples[0];
    if (oldest == null || currentTime <= oldest.time) {
      return 0;
    }
    return (receivedBytes - oldest.receivedBytes) / ((currentTime - oldest.time) / 1000);
  }

  /**
   * @param {number} currentTime
   * @param {boolean} force
   * @returns {void}
   */
  function emit(currentTime, force) {
    if (!force && currentTime - lastEmitTime < EMIT_INTERVAL_MILLIS) {
      return;
    }
    lastEmitTime = currentTime;
    const bytesPerSecond = currentSpeed(currentTime);
    onProgress({
      phase: 'downloading',
      receivedBytes,
      totalBytes,
      bytesPerSecond,
      secondsRemaining: totalBytes == null || bytesPerSecond <= 0 ? null : (totalBytes - receivedBytes) / bytesPerSecond
    });
  }

  /**
   * @param {number} chunkLength
   * @returns {void}
   */
  function addBytes(chunkLength) {
    receivedBytes += chunkLength;
    const currentTime = now();
    samples.push({time: currentTime, receivedBytes});

    /**
     * @returns {boolean}
     */
    function oldestSampleAgedOut() {
      const oldestSampleTime = samples[0]?.time ?? currentTime;
      return currentTime - oldestSampleTime > SPEED_WINDOW_MILLIS;
    }

    while (samples.length > 1 && oldestSampleAgedOut()) {
      samples.shift();
    }
    emit(currentTime, false);
  }

  return {addBytes, flush: () => emit(now(), true)};
}

module.exports = {createProgressReporter};
