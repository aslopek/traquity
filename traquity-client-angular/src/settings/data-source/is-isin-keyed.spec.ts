import {describe, expect, it} from '@jest/globals';
import {isIsinKeyed} from './is-isin-keyed';

describe('isIsinKeyed', (): void => {
  it('is true for a single URL with the ISIN placeholder', (): void => {
    expect(isIsinKeyed({urlPattern: 'https://a.example/#id(isin)'})).toBe(true);
  });

  it('is false for a single URL with the ID placeholder', (): void => {
    expect(isIsinKeyed({urlPattern: 'https://a.example/#id()'})).toBe(false);
  });

  it('is true for a URL list with the ISIN placeholder', (): void => {
    expect(isIsinKeyed({
      urlPatterns: [
        {urlPattern: 'https://a.example/#id(isin)'},
        {urlPattern: 'https://b.example/#id(isin)'}]
    })).toBe(true);
  });

  it('is false for a URL list with the ID placeholder', (): void => {
    expect(isIsinKeyed({urlPatterns: [{urlPattern: 'https://a.example/#id()'}]})).toBe(false);
  });

  it('is false for an undefined data source', (): void => {
    expect(isIsinKeyed(undefined)).toBe(false);
  });
});
