import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {TqCurrencyPipe} from '../../common/pipe/tq-currency.pipe';
import {PositionPerformance} from '../../gen/api/depot-performance';
import {positionPerformanceFactory} from '../../testing/position-performance.factory';
import {CostBasisBreakdownPipe} from './cost-basis-breakdown.pipe';

type Transform = (value: number, currencyCode: string) => string;

describe('CostBasisBreakdownPipe', (): void => {
  let performance: PositionPerformance;
  let transformMock: jest.Mock<Transform>;
  let pipe: CostBasisBreakdownPipe;

  beforeEach((): void => {
    performance = positionPerformanceFactory();
    transformMock = jest.fn((value: number, currencyCode: string): string => `${value} ${currencyCode}`);
    pipe = new CostBasisBreakdownPipe({transform: transformMock} as unknown as TqCurrencyPipe);
  });

  it('flips the three signed lines positive, in the response\'s currency', (): void => {
    const expected: string = `Buys ${-performance.buysGross} ${performance.currency}`
      + ` + Taxes ${-performance.taxes} ${performance.currency} + Fees ${-performance.fees} ${performance.currency}`;

    expect(pipe.transform(performance)).toBe(expected);
    expect(transformMock.mock.calls).toEqual([
      [-performance.buysGross, performance.currency],
      [-performance.taxes, performance.currency],
      [-performance.fees, performance.currency]
    ]);
  });
});
