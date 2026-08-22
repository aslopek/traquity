const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {hasEnoughFreeSpace} = require('./free-space.js');

/** @import {FreeSpaceFileSystem} from './free-space.js' */

describe('hasEnoughFreeSpace', () => {
  const directory = 'D:\\downloads';
  const bavail = 10;
  const bsize = 100;
  const availableBytes = bavail * bsize;

  /** @type {jest.Mock<(path: string) => {bavail: number, bsize: number}>} */
  const statfsSync = jest.fn(() => ({bavail, bsize}));

  /** @type {FreeSpaceFileSystem} */
  let fileSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    statfsSync.mockReturnValue({bavail, bsize});
    fileSystem = {statfsSync};
  });

  it('is true when the available bytes equal the requirement exactly', () => {
    expect(hasEnoughFreeSpace(directory, availableBytes, fileSystem)).toBe(true);
  });

  it('is true when the available bytes exceed the requirement', () => {
    expect(hasEnoughFreeSpace(directory, availableBytes - 1, fileSystem)).toBe(true);
  });

  it('is false when the available bytes fall short of the requirement', () => {
    expect(hasEnoughFreeSpace(directory, availableBytes + 1, fileSystem)).toBe(false);
  });

  it('reads free space for the given directory', () => {
    hasEnoughFreeSpace(directory, availableBytes, fileSystem);

    expect(statfsSync).toHaveBeenCalledTimes(1);
    expect(statfsSync).toHaveBeenCalledWith(directory);
  });
});
