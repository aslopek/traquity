import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {getIsNoticeConfirmedSelector} from './get-is-notice-confirmed.selector';
import {initialState} from '../ai.reducer';

describe('getIsNoticeConfirmedSelector', (): void => {
  let state: AiState;

  beforeEach((): void => {
    state = {...initialState};
  });

  it('reads false when the notice is not confirmed', (): void => {
    expect(getIsNoticeConfirmedSelector(state)).toBe(false);
  });

  it('reads true when the notice is confirmed', (): void => {
    state.isConfirmed = true;

    expect(getIsNoticeConfirmedSelector(state)).toBe(true);
  });
});
