import {describe, expect, it} from '@jest/globals';
import {getRequestCurrencySelector, GetRequestCurrencyState} from './get-request-currency.selector';

describe('getRequestCurrencySelector', (): void => {
  it('returns null while no request currency is set', (): void => {
    expect(getRequestCurrencySelector({
      requestCurrency: null
    } satisfies GetRequestCurrencyState)).toBeNull();
  });

  it('returns the request currency once one is set', (): void => {
    expect(getRequestCurrencySelector({
      requestCurrency: 'CHF'
    } satisfies GetRequestCurrencyState)).toBe('CHF');
  });
});
