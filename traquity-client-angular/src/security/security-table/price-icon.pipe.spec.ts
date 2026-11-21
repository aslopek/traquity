import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {PriceMetaInfo} from '../../gen/api/security';
import {PriceIconPipePipe} from './price-icon.pipe';

describe('PriceIconPipePipe', (): void => {
  let pipe: PriceIconPipePipe;
  let priceMetaInfo: PriceMetaInfo;

  beforeEach((): void => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-21'));
    pipe = new PriceIconPipePipe();
    priceMetaInfo = {
      currency: 'USD',
      latestPrice: 12,
      latestPriceDate: '2026-11-20',
      highTrailingTwelveMonths: 15,
      lowTrailingTwelveMonths: 10,
      oldestPrice: 8,
      oldestPriceDate: '2020-01-02'
    };
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('shows no icon for a recent latest price with a price range', (): void => {
    expect(pipe.transform(priceMetaInfo)).toBeNull();
  });

  it('shows the cancel icon without price information', (): void => {
    expect(pipe.transform(undefined)).toBe('cancel');
  });

  it('shows the outdated icon for a latest price older than six days', (): void => {
    priceMetaInfo.latestPriceDate = '2026-11-14';

    expect(pipe.transform(priceMetaInfo)).toBe('sync_problem');
  });

  it('shows no icon for a latest price exactly six days old', (): void => {
    priceMetaInfo.latestPriceDate = '2026-11-15';

    expect(pipe.transform(priceMetaInfo)).toBeNull();
  });
});
