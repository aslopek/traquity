import {beforeEach, describe, expect, it} from '@jest/globals';
import {
  getHistoricalSecurityPriceConfigSelector,
  GetHistoricalSecurityPriceConfigState
} from './get-historical-security-price-config.selector';
import {HistoricalSecurityPriceConfigRead} from '../../../gen/api/historical-security-price';
import {historicalSecurityPriceConfigFactory} from '../../../testing/historical-security-price-config.factory';

describe('getHistoricalSecurityPriceConfigSelector', (): void => {
  let state: GetHistoricalSecurityPriceConfigState;
  let config: HistoricalSecurityPriceConfigRead;

  beforeEach((): void => {
    config = historicalSecurityPriceConfigFactory();
    state = {
      historicalSecurityPriceConfigs: {
        42: config
      }
    };
  });

  it('returns the config for the given security id, if it exists', (): void => {
    const result: HistoricalSecurityPriceConfigRead | null = getHistoricalSecurityPriceConfigSelector(state, 42);
    expect(result).toBe(config);
  });

  it('returns null if no config exists for the given security id', (): void => {
    const result: HistoricalSecurityPriceConfigRead | null = getHistoricalSecurityPriceConfigSelector(state, 4711);
    expect(result).toBeNull();
  });
});
