import {describe, expect, it} from '@jest/globals';
import {relativeTo} from './depot-values';

describe('relativeTo', (): void => {
  it('divides by a positive baseline', (): void => {
    const numerator: number = -25;
    const baseline: number = 100;

    expect(relativeTo(numerator, baseline)).toBe(numerator / baseline);
  });

  it('is 0 for 0 over a baseline of 0', (): void => {
    expect(relativeTo(0, 0)).toBe(0);
  });

  it('is \'infinity\' for a non-zero value over a baseline of 0', (): void => {
    expect(relativeTo(25, 0)).toBe('infinity');
  });

  it('is \'none\' for a negative baseline', (): void => {
    expect(relativeTo(25, -100)).toBe('none');
  });

  it('is \'none\' for 0 over a negative baseline', (): void => {
    expect(relativeTo(0, -100)).toBe('none');
  });
});
