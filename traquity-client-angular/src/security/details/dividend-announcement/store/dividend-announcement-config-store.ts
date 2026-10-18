import {ReadableSignalStore, WritableSignalStore} from '../../../../common/types/signal-store.type';
import {signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {DividendAnnouncementConfigApi, DividendAnnouncementConfigRead} from '../../../../gen/api/notification/dividend-announcement';
import {inject} from '@angular/core';
import {loadDividendAnnouncementConfig} from './methods/load-dividend-announcement-config';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {setNewConfigValues} from './methods/set-new-config-values';
import {newConfigValuesValid} from './computed/new-config-values-valid';

export type DividendAnnouncementConfigComputed = {
  newConfigValuesValid: () => boolean
};

export type DividendAnnouncementConfigMethods = {
  loadDividendAnnouncementConfig: (securityId: number) => void
  setNewConfigValues: (newConfigValues: DividendAnnouncementConfigParams) => void;
};

export type DividendAnnouncementConfigParams = Pick<DividendAnnouncementConfigRead, 'dataSourceId' | 'externalSecurityId' | 'isActive'>;

export type DividendAnnouncementConfigState = {
  securityId: number | null
  isDirty: boolean
  existingConfig: DividendAnnouncementConfigRead | null
  newConfigValues: DividendAnnouncementConfigParams
};

const initialState: DividendAnnouncementConfigState = {
  securityId: null,
  isDirty: false,
  existingConfig: null,
  newConfigValues: {
    dataSourceId: 0,
    externalSecurityId: '',
    isActive: true
  }
};

export type ReadableDividendAnnouncementConfigStore
  = ReadableSignalStore<DividendAnnouncementConfigState, DividendAnnouncementConfigComputed, DividendAnnouncementConfigMethods>;

export const readableDividendAnnouncementConfigStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<DividendAnnouncementConfigState>,
                globalStore: Store<AppState> = inject(Store)): DividendAnnouncementConfigComputed => {
    return {
      newConfigValuesValid: () => newConfigValuesValid(signalStore, globalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<DividendAnnouncementConfigState, DividendAnnouncementConfigComputed>,
               globalStore: Store<AppState> = inject(Store),
               api: DividendAnnouncementConfigApi = inject(DividendAnnouncementConfigApi)): DividendAnnouncementConfigMethods => {
    return {
      loadDividendAnnouncementConfig: (securityId: number) => loadDividendAnnouncementConfig(signalStore, globalStore, api, securityId),
      setNewConfigValues: (newConfigValues: DividendAnnouncementConfigParams) => setNewConfigValues(signalStore, newConfigValues)
    };
  })
);
