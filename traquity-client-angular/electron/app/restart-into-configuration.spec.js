const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createRestartIntoConfiguration} = require('./restart-into-configuration.js');

/** @import {RestartIntoConfiguration} from './restart-into-configuration.js' */
/** @import {BackendProcess} from '../backend/backend-process.js' */
/** @import {ConfigureOnNextStart} from '../config/configure-on-next-start.js' */

describe('restartIntoConfiguration', () => {
  /** @type {string[]} */
  let calls;

  /** @type {Pick<ConfigureOnNextStart, 'request'>} */
  let configureOnNextStart;

  /** @type {Pick<BackendProcess, 'stop'>} */
  let backendProcess;

  /** @type {Pick<import('electron').App, 'relaunch' | 'exit'>} */
  let app;

  /** @type {RestartIntoConfiguration} */
  let restartIntoConfiguration;

  const request = jest.fn(() => {
    calls.push('request()');
  });
  const stop = jest.fn(/** @type {() => Promise<void>} */ (async () => {
    calls.push('stop()');
  }));
  const relaunch = jest.fn(() => {
    calls.push('relaunch()');
  });
  const exit = jest.fn(/** @type {(code?: number) => void} */ ((code) => {
    calls.push(`exit(${code})`);
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    calls = [];

    configureOnNextStart = {request};
    backendProcess = {stop};
    app = {relaunch, exit};

    restartIntoConfiguration = createRestartIntoConfiguration({configureOnNextStart, backendProcess, app});
  });

  it('sets the flag, stops the backend, relaunches and exits, in that order', async () => {
    await restartIntoConfiguration.restart();

    expect(calls).toEqual(['request()', 'stop()', 'relaunch()', 'exit(0)']);
  });

  it('calls request with no arguments', async () => {
    await restartIntoConfiguration.restart();

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith();
  });

  it('calls stop with no arguments', async () => {
    await restartIntoConfiguration.restart();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledWith();
  });

  it('calls relaunch with no arguments', async () => {
    await restartIntoConfiguration.restart();

    expect(relaunch).toHaveBeenCalledTimes(1);
    expect(relaunch).toHaveBeenCalledWith();
  });

  it('exits with code 0', async () => {
    await restartIntoConfiguration.restart();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('waits for the shutdown before relaunching', async () => {
    stop.mockImplementation(() => new Promise(() => undefined));

    void restartIntoConfiguration.restart();
    await Promise.resolve();

    expect(relaunch).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });
});
