import {describe, expect, it} from '@jest/globals';
import {roundShareCount} from './round-share-count';

describe('roundShareCount', (): void => {
  it('leaves a count that needs no rounding untouched', (): void => {
    expect(roundShareCount(20.5)).toBe(20.5);
  });

  it('clears the error accumulated by adding decimal counts', (): void => {
    expect(roundShareCount(0.7 + 0.1)).toBe(0.8);
  });

  it('clears the error accumulated by subtracting decimal counts', (): void => {
    expect(roundShareCount(0.8 - 0.7)).toBe(0.1);
  });

  it('keeps the tenth decimal place', (): void => {
    expect(roundShareCount(1.0000000001)).toBe(1.0000000001);
  });

  it('drops the eleventh decimal place', (): void => {
    expect(roundShareCount(1.00000000004)).toBe(1);
  });

  it('is 0 for 0', (): void => {
    expect(roundShareCount(0)).toBe(0);
  });
});
