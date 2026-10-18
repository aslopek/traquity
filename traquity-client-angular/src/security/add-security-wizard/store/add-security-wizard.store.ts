import {SecurityCreate} from '../../../gen/api/security';
import {ReadableSignalStore, WritableSignalStore} from '../../../common/types/signal-store.type';
import {signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {inject} from '@angular/core';
import {AppState} from '../../../store/app.state';
import {persist} from './methods/persist';
import {setMasterData} from './methods/set-master-data';
import {setLogo} from './methods/set-logo';
import {HistoricalSecurityPriceConfigCreate} from '../../../gen/api/historical-security-price';
import {setHistoricalSecurityPriceConfig} from './methods/set-historical-security-price-config';
import {DividendAnnouncementConfigCreate} from '../../../gen/api/notification/dividend-announcement';
import {setDividendAnnouncementConfig} from './methods/set-dividend-announcement-config';
import {masterDataStepOk} from './computed/master-data-step-ok';
import {allStepsOk} from './computed/all-steps-ok';

export type AddSecurityWizardComputed = {
  allStepsOk: () => boolean
  masterDataStepOk: () => boolean
};

type Methods = {
  persist: () => void
  setHistoricalSecurityPriceConfig: (config: HistoricalSecurityPriceConfigCreate | null) => void,
  setLogo: (logo: File) => void
  setMasterData: (masterData: SecurityCreate | null) => void
  setDividendAnnouncementConfig: (dividendAnnouncementConfig: DividendAnnouncementConfigCreate | null) => void
};

export type AddSecurityWizardState = {
  masterData: SecurityCreate | null
  logo: File | null
  historicalSecurityPriceConfig: HistoricalSecurityPriceConfigCreate | null
  historicalSecurityPriceConfigStepOk: boolean
  dividendAnnouncementConfig: DividendAnnouncementConfigCreate | null
  dividendAnnouncementConfigStepOk: boolean
};

const initialState: AddSecurityWizardState = {
  masterData: null,
  logo: null,
  historicalSecurityPriceConfig: null,
  historicalSecurityPriceConfigStepOk: true,
  dividendAnnouncementConfig: null,
  dividendAnnouncementConfigStepOk: true
} as const;

export type ReadableAddSecurityWizardStore = ReadableSignalStore<AddSecurityWizardState, AddSecurityWizardComputed, Methods>;

export const addSecurityWizardStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<AddSecurityWizardState>): AddSecurityWizardComputed => {
    return {
      allStepsOk: () => allStepsOk(signalStore),
      masterDataStepOk: () => masterDataStepOk(signalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<AddSecurityWizardState, AddSecurityWizardComputed>,
               globalStore: Store<AppState> = inject(Store)): Methods => {
    return {
      persist: () => persist(signalStore, globalStore),
      setHistoricalSecurityPriceConfig: (config: HistoricalSecurityPriceConfigCreate | null) =>
        setHistoricalSecurityPriceConfig(signalStore, config),
      setLogo: (logo: File) => setLogo(signalStore, logo),
      setMasterData: (masterData: SecurityCreate | null) => setMasterData(signalStore, masterData),
      setDividendAnnouncementConfig: (dividendAnnouncementConfig: DividendAnnouncementConfigCreate | null) =>
        setDividendAnnouncementConfig(signalStore, dividendAnnouncementConfig)
    };
  })
);
