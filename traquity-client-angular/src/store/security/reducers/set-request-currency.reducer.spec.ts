import {beforeEach, describe, expect, it} from '@jest/globals';
import {securityReadFactory} from '../../../testing/security-read.factory';
import {initialState} from '../security.reducer';
import {SecurityState} from '../security.state';
import {setRequestCurrency} from './set-request-currency.reducer';

describe('setRequestCurrency', (): void => {
  let state: Readonly<SecurityState>;

  beforeEach((): void => {
    state = {...initialState};
  });

  it('sets the first request currency', (): void => {
    expect(setRequestCurrency(state, {currency: 'USD'})).toEqual({...initialState, requestCurrency: 'USD'});
  });

  it('replaces the request currency and keeps the loaded securities', (): void => {
    state = {
      ...initialState,
      requestCurrency: 'USD',
      securities: {
        1: securityReadFactory({id: 1})
      }
    };

    expect(setRequestCurrency(state, {currency: 'CHF'})).toEqual({
      ...initialState,
      requestCurrency: 'CHF',
      securities: {
        1: securityReadFactory({id: 1})
      }
    });
  });
});
