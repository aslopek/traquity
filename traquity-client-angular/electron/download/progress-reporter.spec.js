const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createProgressReporter} = require('./progress-reporter.js');

/** @import {DownloadingProgress, ProgressReporter} from './progress-reporter.js' */

describe('createProgressReporter', () => {
  /** @type {number} */
  let clock;
  const now = jest.fn(() => clock);
  const onProgress = jest.fn(/** @type {(progress: DownloadingProgress) => void} */ (() => undefined));

  /** @type {ProgressReporter} */
  let reporter;

  beforeEach(() => {
    jest.clearAllMocks();
    clock = 0;
    reporter = createProgressReporter({now, totalBytes: 100, onProgress});
  });

  it('emits nothing before any bytes arrive', () => {
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('emits a downloading event carrying the received and total bytes', () => {
    reporter.addBytes(40);

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'downloading',
      receivedBytes: 40,
      totalBytes: 100,
      bytesPerSecond: 0,
      secondsRemaining: null
    });
  });

  it('throttles emissions less than 200ms apart', () => {
    reporter.addBytes(10);
    clock = 100;
    reporter.addBytes(10);

    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('emits again once 200ms have passed', () => {
    reporter.addBytes(10);
    clock = 200;
    reporter.addBytes(10);

    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  it('computes bytesPerSecond and secondsRemaining once time has passed since the first sample', () => {
    reporter.addBytes(10);
    clock = 1000;
    reporter.addBytes(10);

    expect(onProgress).toHaveBeenLastCalledWith({
      phase: 'downloading',
      receivedBytes: 20,
      totalBytes: 100,
      bytesPerSecond: 10,
      secondsRemaining: 8
    });
  });

  it('drops samples that aged out of the rolling window rather than averaging since the start', () => {
    reporter.addBytes(10);
    clock = 1000;
    reporter.addBytes(10);
    clock = 6000;
    reporter.addBytes(80);

    // the t=0 sample is now outside the 5s window and dropped, leaving only the t=1000..t=6000 span to average over:
    // 80 bytes over 5s, rather than 100 bytes over 6s
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({bytesPerSecond: 16}));
  });

  it('reports null totalBytes and secondsRemaining as given, unable to derive either', () => {
    reporter = createProgressReporter({now, totalBytes: null, onProgress});

    reporter.addBytes(10);

    expect(onProgress).toHaveBeenCalledWith({
      phase: 'downloading',
      receivedBytes: 10,
      totalBytes: null,
      bytesPerSecond: 0,
      secondsRemaining: null
    });
  });

  it('flush emits unconditionally, bypassing the throttle', () => {
    reporter.addBytes(10);
    reporter.flush();

    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  it('flush emits nothing new when called before any bytes arrived beyond the initial zero state', () => {
    reporter.flush();

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'downloading',
      receivedBytes: 0,
      totalBytes: 100,
      bytesPerSecond: 0,
      secondsRemaining: null
    });
  });
});
