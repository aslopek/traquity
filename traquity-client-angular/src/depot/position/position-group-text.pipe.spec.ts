import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {PositionGroupTextPipe} from './position-group-text.pipe';
import {TqCurrencyPipe} from '../../common/pipe/tq-currency.pipe';
import {TqPercentPipe} from '../../common/pipe/tq-percent.pipe';
import {PositionGroup} from '../../store/depot/position-grouping/position-group.type';

describe('PositionGroupTextPipe', (): void => {
  let group: PositionGroup;
  let tqCurrencyPipe: TqCurrencyPipe;
  let tqPercentPipe: TqPercentPipe;
  let pipe: PositionGroupTextPipe;

  beforeEach((): void => {
    group = {
      name: 'Technology',
      positions: [],
      buyInAbsolute: 5000,
      buyInRelative: 4000,
      currentSizeAbsolute: 6000,
      currentSizeRelative: 5604
    };

    tqCurrencyPipe = {
      transform: jest.fn((_value: string | number, _currencyCode: string): string => '$6,000.00')
    } as unknown as TqCurrencyPipe;
    tqPercentPipe = {
      transform: jest.fn((_value: string | number): string => '56.04%')
    } as unknown as TqPercentPipe;

    pipe = new PositionGroupTextPipe(tqCurrencyPipe, tqPercentPipe);
  });

  it.each([true, false] satisfies boolean[])
  ('returns the name and the relative size when includeAbsolute is false and hideAbsoluteValues is %s',
    (hideAbsoluteValues: boolean): void => {
      expect(pipe.transform(group, false, hideAbsoluteValues, false, 'USD')).toBe('Technology · 56.04%');
    });

  it('appends the absolute size when includeAbsolute is true and absolute values are not hidden', (): void => {
    expect(pipe.transform(group, false, false, true, 'USD')).toBe('Technology · 56.04% · $6,000.00');
  });

  it('omits the absolute size when hideAbsoluteValues is true, even though includeAbsolute is true', (): void => {
    expect(pipe.transform(group, false, true, true, 'USD')).toBe('Technology · 56.04%');
  });

  it('reads the buy-in basis when useBuyIn is true', (): void => {
    pipe.transform(group, true, false, true, 'USD');
    expect(tqPercentPipe.transform).toHaveBeenCalledTimes(1);
    expect(tqPercentPipe.transform).toHaveBeenCalledWith(group.buyInRelative);
    expect(tqCurrencyPipe.transform).toHaveBeenCalledTimes(1);
    expect(tqCurrencyPipe.transform).toHaveBeenCalledWith(group.buyInAbsolute, 'USD');
  });

  it('reads the current-size basis when useBuyIn is false', (): void => {
    pipe.transform(group, false, false, true, 'USD');
    expect(tqPercentPipe.transform).toHaveBeenCalledTimes(1);
    expect(tqPercentPipe.transform).toHaveBeenCalledWith(group.currentSizeRelative);
    expect(tqCurrencyPipe.transform).toHaveBeenCalledTimes(1);
    expect(tqCurrencyPipe.transform).toHaveBeenCalledWith(group.currentSizeAbsolute, 'USD');
  });
});
