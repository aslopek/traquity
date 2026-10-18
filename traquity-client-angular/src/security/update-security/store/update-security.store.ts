import {ReadableSignalStore, WritableSignalStore} from '../../../common/types/signal-store.type';
import {signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {AppState} from '../../../store/app.state';
import {inject} from '@angular/core';
import {SecurityCreate} from '../../../gen/api/security';
import {setSecurity} from './methods/set-security';
import {masterDataValid} from './computed/master-data-valid';
import {enableOkAndApply} from './computed/enable-ok-and-apply';
import {setLogo} from './methods/set-logo';
import {setMasterData} from './methods/set-master-data';
import {persist} from './methods/persist';
import {HistoricalSecurityPriceConfigCreate} from '../../../gen/api/historical-security-price';
import {setHistoricalSecurityPriceConfig} from './methods/set-historical-security-price-config';
import {historicalSecurityPriceConfigValid} from './computed/historical-security-price-config-valid';
import {setUntouched} from './methods/set-untouched';
import {DividendAnnouncementConfigChangedEvent} from '../../details/dividend-announcement/dividend-announcement-config.component';
import {dividendAnnouncementConfigValid} from './computed/dividend-announcement-config-valid';
import {setDividendAnnouncementConfig} from './methods/set-dividend-announcement-config';
import {DividendAnnouncementConfigApi} from '../../../gen/api/notification/dividend-announcement';

export type UpdateSecurityComputed = {
  masterDataValid: () => boolean
  historicalSecurityPriceConfigValid: () => boolean
  dividendAnnouncementConfigValid: () => boolean
  enableOkAndApply: () => boolean
};

export type UpdateSecurityMethods = {
  persist: () => void
  setUntouched: () => void
  setLogo: (logo: File) => void
  setMasterData: (masterData: SecurityCreate | null) => void
  setSecurity: (securityId: number) => void
  setHistoricalSecurityPriceConfig: (config: HistoricalSecurityPriceConfigCreate | null) => void
  setDividendAnnouncementConfig: (config: DividendAnnouncementConfigChangedEvent | null) => void
};

export type UpdateSecurityState = {
  securityId: number | null
  masterData: SecurityCreate | null
  logo: File | null
  masterDataTouched: boolean
  logoTouched: boolean
  historicalSecurityPriceConfig: HistoricalSecurityPriceConfigCreate | null
  historicalSecurityPriceConfigTouched: boolean
  dividendAnnouncementConfig: DividendAnnouncementConfigChangedEvent | null
  dividendAnnouncementConfigTouched: boolean
};

const initialState: UpdateSecurityState = {
  securityId: null,
  masterData: null,
  logo: null,
  masterDataTouched: false,
  logoTouched: false,
  historicalSecurityPriceConfig: null,
  historicalSecurityPriceConfigTouched: false,
  dividendAnnouncementConfig: null,
  dividendAnnouncementConfigTouched: false,
} as const;

export type ReadableUpdateSecurityStore = ReadableSignalStore<UpdateSecurityState, UpdateSecurityComputed, UpdateSecurityMethods>;

export const updateSecurityStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<UpdateSecurityState>): UpdateSecurityComputed => {
    return {
      masterDataValid: () => masterDataValid(signalStore),
      historicalSecurityPriceConfigValid: () => historicalSecurityPriceConfigValid(signalStore),
      dividendAnnouncementConfigValid: () => dividendAnnouncementConfigValid(signalStore),
      enableOkAndApply: () => enableOkAndApply(signalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<UpdateSecurityState, UpdateSecurityComputed>,
               globalStore: Store<AppState> = inject(Store),
               dividendAnnouncementConfigApi: DividendAnnouncementConfigApi = inject(DividendAnnouncementConfigApi)): UpdateSecurityMethods => {
    return {
      persist: () => persist(signalStore, globalStore, dividendAnnouncementConfigApi),
      setUntouched: () => setUntouched(signalStore),
      setLogo: (logo: File) => setLogo(signalStore, logo),
      setMasterData: (masterData: SecurityCreate | null) => setMasterData(signalStore, masterData),
      setSecurity: (securityId: number) => setSecurity(signalStore, globalStore, securityId),
      setHistoricalSecurityPriceConfig: (config: HistoricalSecurityPriceConfigCreate | null) =>
        setHistoricalSecurityPriceConfig(signalStore, config),
      setDividendAnnouncementConfig: (config: DividendAnnouncementConfigChangedEvent | null) =>
        setDividendAnnouncementConfig(signalStore, config)
    };
  })
);
