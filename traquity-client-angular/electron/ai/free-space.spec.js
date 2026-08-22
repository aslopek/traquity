const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {GIBIBYTE, hasEnoughFreeSpace} = require('./free-space.js');

/** @import {FreeSpaceFileSystem} from './free-space.js' */

describe('hasEnoughFreeSpace', () => {
  const directory = 'D:\\downloads';

  /** @type {jest.Mock<(path: string) => {bavail: number, bsize: number}>} */
  const statfsSync = jest.fn(() => ({bavail: 10, bsize: GIBIBYTE}));

  /** @type {FreeSpaceFileSystem} */
  let fileSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    statfsSync.mockReturnValue({bavail: 10, bsize: GIBIBYTE});
    fileSystem = {statfsSync};
  });

  it('is true when the available bytes equal the requirement exactly', () => {
    expect(hasEnoughFreeSpace(directory, 10 * GIBIBYTE, fileSystem)).toBe(true);
  });

  it('is true when the available bytes exceed the requirement', () => {
    expect(hasEnoughFreeSpace(directory, 9 * GIBIBYTE, fileSystem)).toBe(true);
  });

  it('is false when the available bytes fall short of the requirement', () => {
    expect(hasEnoughFreeSpace(directory, 11 * GIBIBYTE, fileSystem)).toBe(false);
  });

  it('reads free space for the given directory', () => {
    hasEnoughFreeSpace(directory, GIBIBYTE, fileSystem);

    expect(statfsSync).toHaveBeenCalledTimes(1);
    expect(statfsSync).toHaveBeenCalledWith(directory);
  });
});
