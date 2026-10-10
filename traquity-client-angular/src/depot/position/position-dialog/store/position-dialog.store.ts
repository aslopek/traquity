import {DepotPositionApi, Lot} from '../../../../gen/api/depot-position';
import {signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {ReadableSignalStore, WritableSignalStore} from '../../../../common/types/signal-store.type';
import {setDepotsAndSecurities, SetDepotsAndSecuritiesFunction} from './methods/set-depots-and-securities';
import {setSimulationInputs} from './methods/set-simulation-inputs';
import {sharesHeld} from './computed/shares-held';
import {currentPricePerShare} from './computed/current-price-per-share';
import {saleResult, SaleResult} from './computed/sale-result';
import {lotsWithSoldFraction, LotWithSoldFraction} from './computed/lots-with-sold-fraction';
import {inject, Signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';

export type SellSimulationInputs = {
  sharesToSell: number
  pricePerShare: number
  taxFreeGainsPercent: number
  taxRatePercent: number
  fee: number
  feesReduceTaxableGain: boolean
  buyTaxesReduceTaxableGain: boolean
};

export type PositionDialogState = {
  depotIds: number[]
  securityIds: number[]
  lots: Lot[]
  simulationInputs: SellSimulationInputs | null
};

export type PositionDialogComputed = {
  currentPricePerShare: Signal<number | null>
  lotsWithSoldFraction: Signal<LotWithSoldFraction[]>
  saleResult: Signal<SaleResult | null>
  sharesHeld: Signal<number>
};

export type PositionDialogMethods = {
  setDepotsAndSecurities: SetDepotsAndSecuritiesFunction
  setSimulationInputs: (inputs: SellSimulationInputs | null) => void
};

export const initialState: PositionDialogState = {
  depotIds: [],
  securityIds: [],
  lots: [],
  simulationInputs: null
};

export type ReadablePositionDialogStore = ReadableSignalStore<PositionDialogState, PositionDialogComputed, PositionDialogMethods>;

export const PositionDialogStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<PositionDialogState>): PositionDialogComputed => {
    return {
      currentPricePerShare: currentPricePerShare(signalStore),
      lotsWithSoldFraction: lotsWithSoldFraction(signalStore),
      saleResult: saleResult(signalStore),
      sharesHeld: sharesHeld(signalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<PositionDialogState, PositionDialogComputed>,
               depotPositionApi: DepotPositionApi = inject(DepotPositionApi),
               globalStore: Store<AppState> = inject(Store)): PositionDialogMethods => {
    return {
      setDepotsAndSecurities: setDepotsAndSecurities(signalStore, depotPositionApi, globalStore),
      setSimulationInputs: (inputs: SellSimulationInputs | null): void => setSimulationInputs(signalStore, inputs)
    };
  })
);
