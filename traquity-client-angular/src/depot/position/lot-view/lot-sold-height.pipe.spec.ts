import {beforeEach, describe, expect, it} from '@jest/globals';
import {LotSoldHeightPipe} from './lot-sold-height.pipe';

describe('LotSoldHeightPipe', (): void => {
  let pipe: LotSoldHeightPipe;

  beforeEach((): void => {
    pipe = new LotSoldHeightPipe();
  });

  it('renders a part of a lot as that percentage', (): void => {
    expect(pipe.transform(0.625)).toBe('62.5%');
  });

  it('renders a whole lot as the full height', (): void => {
    expect(pipe.transform(1)).toBe('100%');
  });

  it('renders an untouched lot as no height', (): void => {
    expect(pipe.transform(0)).toBe('0%');
  });

  it('rounds a repeating fraction to two decimals', (): void => {
    expect(pipe.transform(1 / 3)).toBe('33.33%');
  });

  it('clamps a fraction above 1 to the full height', (): void => {
    expect(pipe.transform(1.5)).toBe('100%');
  });

  it('clamps a negative fraction to no height', (): void => {
    expect(pipe.transform(-0.5)).toBe('0%');
  });
});
