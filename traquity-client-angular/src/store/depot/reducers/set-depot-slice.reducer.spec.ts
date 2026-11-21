import {beforeEach, describe, expect, it} from '@jest/globals';
import {SetDepotsSliceActionArgs} from '../depot.actions';
import {initialState} from '../depot.reducer';
import {DepotState} from '../depot.state';
import {setDepotSliceReducer} from './set-depot-slice.reducer';

describe('setDepotSliceReducer', (): void => {
  let state: DepotState;
  let actionArgs: SetDepotsSliceActionArgs;

  beforeEach((): void => {
    state = {
      ...initialState,
      selectedDepotCurrency: 'USD'
    };
    actionArgs = {
      depots: [],
      selectedDepotIds: [],
      selectedTabIndex: initialState.selectedTabIndex,
      dividend: initialState.dividend,
      position: initialState.position,
      performance: initialState.performance
    };
  });

  it('falls back to the default currency when there are no depots', (): void => {
    expect(setDepotSliceReducer(state, actionArgs)).toEqual({
      ...initialState,
      depots: [],
      initialized: true,
      selectedDepotCurrency: 'EUR',
      selectedDepotIds: []
    });
  });

  it('falls back to the default currency and drops the selection when the selected depots no longer exist', (): void => {
    actionArgs.selectedDepotIds = [7];

    expect(setDepotSliceReducer(state, actionArgs)).toEqual({
      ...initialState,
      depots: [],
      initialized: true,
      selectedDepotCurrency: 'EUR',
      selectedDepotIds: []
    });
  });
});
