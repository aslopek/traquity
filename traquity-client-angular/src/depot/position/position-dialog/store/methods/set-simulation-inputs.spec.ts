import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {initialState, PositionDialogState, SellSimulationInputs} from '../position-dialog.store';
import {lotFactory} from '../../../../../testing/lot.factory';
import {setSimulationInputs} from './set-simulation-inputs';

describe('setSimulationInputs', (): void => {
  let store: SignalState<PositionDialogState>;
  let inputs: SellSimulationInputs;

  beforeEach((): void => {
    store = signalState<PositionDialogState>({...initialState});
    inputs = {
      sharesToSell: 10,
      pricePerShare: 12.5,
      taxFreeGainsPercent: 0,
      taxRatePercent: 25,
      fee: 1,
      feesReduceTaxableGain: true,
      buyTaxesReduceTaxableGain: true
    };
  });

  it('sets the simulation inputs', (): void => {
    setSimulationInputs(store, inputs);

    expect(getState(store)).toEqual({...initialState, simulationInputs: inputs});
  });

  describe('when lots are already loaded', (): void => {
    beforeEach((): void => {
      store = signalState<PositionDialogState>({...initialState, lots: [lotFactory()]});
    });

    it('leaves the loaded lots alone', (): void => {
      setSimulationInputs(store, inputs);

      expect(getState(store)).toEqual({...initialState, lots: [lotFactory()], simulationInputs: inputs});
    });

    it('leaves the loaded lots alone when clearing the simulation inputs', (): void => {
      store = signalState<PositionDialogState>({...initialState, lots: [lotFactory()], simulationInputs: inputs});

      setSimulationInputs(store, null);

      expect(getState(store)).toEqual({...initialState, lots: [lotFactory()], simulationInputs: null});
    });
  });

  it('clears the simulation inputs', (): void => {
    store = signalState<PositionDialogState>({...initialState, simulationInputs: inputs});

    setSimulationInputs(store, null);

    expect(getState(store)).toEqual({...initialState, simulationInputs: null});
  });
});
