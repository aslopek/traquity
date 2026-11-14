import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {PositionPerformance} from '../../../../gen/api/depot-performance';
import {positionPerformanceFactory} from '../../../../testing/position-performance.factory';
import {relativePerformance} from './relative-performance';
import {RelativePerformance} from '../../../../common/types/relative-performance';

describe('relativePerformance', (): void => {
  let performance: WritableSignal<PositionPerformance | null>;

  beforeEach((): void => {
    performance = signal<PositionPerformance | null>(positionPerformanceFactory());
  });

  function result(): Signal<RelativePerformance | null> {
    return relativePerformance({performance});
  }

  it('is the loaded response\'s own ratio', (): void => {
    expect(result()()).toBe(0.2411);
  });

  it('is \'infinity\' when the response has no performanceRelative and a zero costBasis', (): void => {
    performance.set(positionPerformanceFactory({
      performanceRelative: undefined,
      costBasis: 0
    }));

    expect(result()()).toBe('infinity');
  });

  it('is \'none\' when the response has no performanceRelative and a negative costBasis', (): void => {
    performance.set(positionPerformanceFactory({
      performanceRelative: undefined,
      costBasis: -10
    }));

    expect(result()()).toBe('none');
  });

  it('is null when no response is loaded', (): void => {
    performance.set(null);

    expect(result()()).toBeNull();
  });
});
