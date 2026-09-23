import {beforeEach, describe, expect, it} from '@jest/globals';
import {setPerformanceDataReducer} from './set-performance-data.reducer';
import {DepotState, Positions} from '../depot.state';
import {LoadDividendsPositionsSuccessActionArgs} from '../depot.actions';
import {Performance} from '../../../gen/api/depot-performance';
import {Dividends} from '../../../gen/api/depot-dividend';
import {DepotComposition} from '../../../gen/api/depot-position';
import {depotPositionFactory} from '../../../testing/depot-position.factory';
import {performanceFactory} from '../../../testing/performance.factory';
import {initialState} from "../depot.reducer";

describe('setPerformanceDataReducer', (): void => {
  let positions: DepotComposition;
  let income: Performance;
  let state: Readonly<DepotState>;
  let args: LoadDividendsPositionsSuccessActionArgs;

  beforeEach((): void => {
    positions = {
      currency: 'EUR',
      buyInAbsolute: 1000,
      currentSizeAbsolute: 1200,
      performanceAbsolute: 200,
      performanceRelative: 20,
      positions: [depotPositionFactory({securityIds: [1]})]
    };
    income = performanceFactory({securityIds: [1]});
    state = {
      ...initialState
    };
    args = {
      positions,
      dividends: null,
      income: [income]
    };
  });

  it('keys the income under the security ID it covers', (): void => {
    const result: DepotState = setPerformanceDataReducer(state, args);
    expect(result.position.incomeByPosition).toEqual({1: income});
    expect(result.position.incomeByPosition[1]).toBe(income);
  });

  it('keys income consolidated over a security group under every one of its security IDs', (): void => {
    income = performanceFactory({securityIds: [1, 2]});
    args.income = [income];

    const result: DepotState = setPerformanceDataReducer(state, args);

    expect(result.position.incomeByPosition[1]).toBe(income);
    expect(result.position.incomeByPosition[2]).toBe(income);
  });

  it('keys each income entry separately', (): void => {
    const otherIncome: Performance = performanceFactory({securityIds: [2]});
    args.income = [
      income,
      otherIncome
    ];

    const result: DepotState = setPerformanceDataReducer(state, args);

    expect(result.position.incomeByPosition[1]).toBe(income);
    expect(result.position.incomeByPosition[2]).toBe(otherIncome);
  });

  it('empties the income when none is given', (): void => {
    args.income = null;
    const result: DepotState = setPerformanceDataReducer(state, args);
    expect(result.position.incomeByPosition).toEqual({});
  });

  it('overwrites the positions', (): void => {
    const result: DepotState = setPerformanceDataReducer(state, args);
    expect(result.position.positions).toBe(positions);
  });

  it('keeps the previous positions when none are given', (): void => {
    const previousPositions: Positions = {
      buyInAbsolute: 500,
      currentSizeAbsolute: 600,
      performanceAbsolute: 100,
      performanceRelative: 20,
      positions: [depotPositionFactory()]
    };
    state = {
      ...state,
      position: {
        ...state.position,
        positions: previousPositions
      }
    };
    args.positions = null;

    const result: DepotState = setPerformanceDataReducer(state, args);

    expect(result.position.positions).toBe(previousPositions);
  });

  it('overwrites the dividends', (): void => {
    const dividends: Dividends = {
      byYear: [],
      byQuarter: [],
      byMonth: [],
      dividendYield: []
    };
    args.dividends = dividends;

    const result: DepotState = setPerformanceDataReducer(state, args);

    expect(result.dividend.dividends).toBe(dividends);
  });
});
