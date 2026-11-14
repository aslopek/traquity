import {describe, expect, it} from '@jest/globals';
import {countPattern, isValidCount} from './transaction-count';

describe('countPattern', (): void => {
  it.each([
    '20',
    '0.5',
    '0,5',
    '19.908'
  ] satisfies string[])('matches the count %s', (count: string): void => {
    expect(countPattern.test(count)).toBe(true);
  });

  it.each([
    '0',
    '0.0',
    '0,0',
    '-0'
  ] satisfies string[])('does not match the count %s of 0', (count: string): void => {
    expect(countPattern.test(count)).toBe(false);
  });

  it.each([
    '-1',
    '-0.5'
  ] satisfies string[])('does not match the negative count %s', (count: string): void => {
    expect(countPattern.test(count)).toBe(false);
  });
});

describe('isValidCount', (): void => {
  it.each([
    20,
    0.5
  ] satisfies number[])('accepts the count %s above 0', (count: number): void => {
    expect(isValidCount(count)).toBe(true);
  });

  it('rejects a count of 0', (): void => {
    expect(isValidCount(0)).toBe(false);
  });

  it.each([
    -1,
    -0.5
  ] satisfies number[])('rejects the negative count %s', (count: number): void => {
    expect(isValidCount(count)).toBe(false);
  });

  it('rejects a missing count', (): void => {
    expect(isValidCount(undefined)).toBe(false);
  });
});
