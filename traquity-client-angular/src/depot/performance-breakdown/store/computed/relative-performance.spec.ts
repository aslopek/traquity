import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {PositionPerformance} from '../../../../gen/api/depot-performance';
import {positionPerformanceFactory} from '../../../../testing/position-performance.factory';
import {relativePerformance} from './relative-performance';

describe('relativePerformance', (): void => {
  let performance: WritableSignal<PositionPerformance | null>;

  beforeEach((): void => {
    performance = signal<PositionPerformance | null>(positionPerformanceFactory());
  });

  function result(): Signal<number | 'infinity' | null> {
    return relativePerformance({performance});
  }

  it('is the loaded response\'s own ratio', (): void => {
    expect(result()()).toBe(0.2411);
  });

  it('is \'infinity\' while the response carries no performanceRelative', (): void => {
    performance.set(positionPerformanceFactory({performanceRelative: undefined}));

    expect(result()()).toBe('infinity');
  });

  it('is null while no response is loaded', (): void => {
    performance.set(null);

    expect(result()()).toBeNull();
  });
});
