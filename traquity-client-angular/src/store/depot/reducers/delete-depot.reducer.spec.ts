import {beforeEach, describe, expect, it} from '@jest/globals';
import {DepotRead} from '../../../gen/api/depot';
import {depotReadFactory} from '../../../testing/depot-read.factory';
import {DeleteDepotSuccessActionArgs} from '../depot.actions';
import {initialState} from '../depot.reducer';
import {DepotState} from '../depot.state';
import {deleteDepotReducer} from './delete-depot.reducer';

describe('deleteDepotReducer', (): void => {
  let remainingDepot: DepotRead;
  let deletedDepot: DepotRead;
  let state: DepotState;
  let actionArgs: DeleteDepotSuccessActionArgs;

  beforeEach((): void => {
    remainingDepot = depotReadFactory({
      id: 1,
      currency: 'CHF'
    });

    deletedDepot = depotReadFactory({
      id: 2,
      currency: 'USD'
    });

    state = {
      ...initialState,
      depots: [remainingDepot, deletedDepot],
      selectedDepotCurrency: 'CHF',
      selectedDepotIds: [1]
    };
    actionArgs = {depotId: 2};
  });

  it('keeps the selection when an unselected depot is deleted', (): void => {
    expect(deleteDepotReducer(state, actionArgs)).toEqual({
      ...initialState,
      depots: [remainingDepot],
      selectedDepotCurrency: 'CHF',
      selectedDepotIds: [1]
    });
  });

  it('selects the first remaining depot and takes its currency when the last selected depot is deleted', (): void => {
    state = {
      ...state,
      selectedDepotCurrency: 'USD',
      selectedDepotIds: [2]
    };

    expect(deleteDepotReducer(state, actionArgs)).toEqual({
      ...initialState,
      depots: [remainingDepot],
      selectedDepotCurrency: 'CHF',
      selectedDepotIds: [1]
    });
  });

  it('falls back to the default currency when the last depot is deleted', (): void => {
    state = {
      ...state,
      depots: [deletedDepot],
      selectedDepotCurrency: 'USD',
      selectedDepotIds: [2]
    };

    expect(deleteDepotReducer(state, actionArgs)).toEqual({
      ...initialState,
      depots: [],
      selectedDepotCurrency: 'EUR',
      selectedDepotIds: []
    });
  });
});
