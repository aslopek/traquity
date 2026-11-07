import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {DividendAnnouncementConfigParams, DividendAnnouncementConfigState} from '../dividend-announcement-config-store';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {getAllDataSources} from '../../../../../store/dividend-announcement/dividend-announcement.selector';
import {DividendAnnouncementDataSourceRead} from '../../../../../gen/api/notification/dividend-announcement';
import {isinKeyed} from './isin-keyed';

export type NewConfigValuesValidState = Pick<DividendAnnouncementConfigState, 'newConfigValues'>;

export function newConfigValuesValid(signalStore: ReadableSignalStore<NewConfigValuesValidState>,
                                     globalStore: Store<AppState>): boolean {
  const newConfigValues: DividendAnnouncementConfigParams = signalStore.newConfigValues();
  if (newConfigValues.externalSecurityId.trim().length === 0 && !isinKeyed(signalStore, globalStore)) {
    return false;
  }

  return globalStore.selectSignal(getAllDataSources)()
    .some((ds: DividendAnnouncementDataSourceRead): boolean => ds.id === newConfigValues.dataSourceId);
}
