import {beforeEach, describe, expect, it} from '@jest/globals';
import {SecuritiesById} from '../../../../store/security/security.state';
import {securityReadFactory, withOldestPriceDate} from '../../../../testing/security-read.factory';
import {benchmarkSecurityOptions} from './benchmark-security-option';

describe('benchmarkSecurityOptions', (): void => {
  const oldestShownDay: string = '2026-01-10';

  let securities: SecuritiesById;

  beforeEach((): void => {
    securities = {
      1: withOldestPriceDate(1, '2026-01-09'),
      2: withOldestPriceDate(2, oldestShownDay),
      3: withOldestPriceDate(3, '2026-01-11'),
      4: securityReadFactory({
        id: 4,
        priceMetaInfo: undefined
      })
    };
  });

  it('keeps the given order and describes each security', (): void => {
    expect(benchmarkSecurityOptions([3, 1], securities, oldestShownDay)).toEqual([
      {securityId: 3, oldestPriceDate: '2026-01-11', selectable: false},
      {securityId: 1, oldestPriceDate: '2026-01-09', selectable: true}
    ]);
  });

  it('makes a security selectable whose oldest price lies on the first day', (): void => {
    expect(benchmarkSecurityOptions([2], securities, oldestShownDay)).toEqual([
      {securityId: 2, oldestPriceDate: '2026-01-10', selectable: true}
    ]);
  });

  it('makes a security without price information unselectable', (): void => {
    expect(benchmarkSecurityOptions([4], securities, oldestShownDay)).toEqual([
      {securityId: 4, oldestPriceDate: null, selectable: false}
    ]);
  });

  it('returns no options without a first day', (): void => {
    expect(benchmarkSecurityOptions([1, 3, 4], securities, null)).toEqual([]);
  });
});
