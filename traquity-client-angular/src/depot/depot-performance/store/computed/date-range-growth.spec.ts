import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {relativeTo} from './depot-values';
import {dateRangeGrowth} from './date-range-growth';

jest.mock('./depot-values', (): unknown => ({relativeTo: jest.fn()}));

type RelativeToFunction = typeof relativeTo;

describe('dateRangeGrowth', (): void => {
  let relativeToMock: jest.Mock<RelativeToFunction>;
  let depotValues: RebasedDepotValue[];

  beforeEach((): void => {
    relativeToMock = relativeTo as unknown as jest.Mock<RelativeToFunction>;
    relativeToMock.mockReset();
    relativeToMock.mockReturnValue(0.42);
    depotValues = [
      rebasedDepotValueFactory({date: '2026-11-19', investedCapital: 80, absoluteValue: 90}),
      rebasedDepotValueFactory({date: '2026-11-20', investedCapital: 100, absoluteValue: 130})
    ];
  });

  it('grows from the last shown day\'s invested capital', (): void => {
    expect(dateRangeGrowth(depotValues, false, 150)).toEqual({growthAbsolute: 50, growthRelative: 0.42});
    expect(relativeToMock.mock.calls).toEqual([[50, 100]]);
  });

  it('grows from the first shown day\'s value while rebased', (): void => {
    expect(dateRangeGrowth(depotValues, true, 150)).toEqual({growthAbsolute: 60, growthRelative: 0.42});
    expect(relativeToMock.mock.calls).toEqual([[60, 90]]);
  });

  it('has no growth on a single shown day', (): void => {
    expect(dateRangeGrowth([depotValues[1]], false, 150)).toEqual({growthAbsolute: 0, growthRelative: 0});
    expect(relativeToMock).not.toHaveBeenCalled();
  });
});
