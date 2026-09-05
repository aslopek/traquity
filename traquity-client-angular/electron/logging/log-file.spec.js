const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {createLogFile} = require('./log-file.js');

/** @import {LogFile, LogFileSystem} from './log-file.js' */

const LOG_PATH = '/home/user/traquity/traquity.log';
const TIMESTAMP = '2026-08-29T09:20:00.000Z';

describe('createLogFile', () => {

  /** @type {jest.Mock<(path: string, data: string, options: {mode: number}) => void>} */
  let appendFileSync;
  /** @type {jest.Mock<(message: string, error: unknown) => void>} */
  let error;
  /** @type {LogFile} */
  let subjectUnderTest;

  beforeEach(() => {
    appendFileSync = jest.fn();
    error = jest.fn();

    /** @type {LogFileSystem} */
    const fileSystem = {appendFileSync};
    subjectUnderTest = createLogFile({
      fileSystem,
      logPath: LOG_PATH,
      now: () => new Date(TIMESTAMP),
      logger: {error}
    });
  });

  it('appends the timestamped entry to the log file', () => {
    subjectUnderTest.write('the model answered');

    expect(appendFileSync).toHaveBeenCalledWith(LOG_PATH, `${TIMESTAMP} the model answered\n`, {mode: 0o600});
    expect(appendFileSync).toHaveBeenCalledTimes(1);
  });

  it('keeps a multi-line entry as it was given, timestamping its first line only', () => {
    subjectUnderTest.write('grammar:\nroot ::= "{}"\nws ::= [ ]');

    expect(appendFileSync).toHaveBeenCalledWith(LOG_PATH, `${TIMESTAMP} grammar:\nroot ::= "{}"\nws ::= [ ]\n`,
      {mode: 0o600});
    expect(appendFileSync).toHaveBeenCalledTimes(1);
  });

  it('writes the entries in the order they were made', () => {
    subjectUnderTest.write('first');
    subjectUnderTest.write('second');

    expect(appendFileSync.mock.calls).toEqual([
      [LOG_PATH, `${TIMESTAMP} first\n`, {mode: 0o600}],
      [LOG_PATH, `${TIMESTAMP} second\n`, {mode: 0o600}]
    ]);
  });

  it('reports a failed write instead of throwing, so nothing fails over a log entry', () => {
    const failure = new Error('EACCES');
    appendFileSync.mockImplementation(() => {
      throw failure;
    });

    expect(() => subjectUnderTest.write('log message')).not.toThrow();
    expect(error).toHaveBeenCalledWith(`Failed to write to ${LOG_PATH}:`, failure);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
