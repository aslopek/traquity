import {beforeEach, describe, expect, it} from '@jest/globals';
import {setPositionGroupByReducer} from './set-position-group-by.reducer';
import {DepotState} from '../../depot.state';
import {SetPositionGroupByActionArgs} from '../../depot.actions';
import {initialState} from '../../depot.reducer';

describe('setPositionGroupByReducer', (): void => {
  let state: Readonly<DepotState>;
  let args: SetPositionGroupByActionArgs;

  beforeEach((): void => {
    state = {
      ...initialState
    };
    args = {groupBy: 'sector'};
  });

  it('sets the group-by value', (): void => {
    const result: DepotState = setPositionGroupByReducer(state, args);
    expect(result.position.groupBy).toBe('sector');
  });

  it('returns the same state object when the value is unchanged', (): void => {
    args = {groupBy: 'none'};
    const result: DepotState = setPositionGroupByReducer(state, args);
    expect(result).toBe(state);
  });
});
