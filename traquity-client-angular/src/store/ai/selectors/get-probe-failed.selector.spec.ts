import {describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {getProbeFailedSelector} from './get-probe-failed.selector';
import {initialState} from '../ai.reducer';

describe('getProbeFailedSelector', (): void => {
  it('reads false without the bridge ever having reported state', (): void => {
    expect(getProbeFailedSelector(initialState)).toBe(false);
  });

  it('reads true once the bridge reported a failed probe', (): void => {
    const state: AiState = {...initialState, probeFailed: true};

    expect(getProbeFailedSelector(state)).toBe(true);
  });
});
