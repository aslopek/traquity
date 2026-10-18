import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {DividendAnnouncementConfigParams, DividendAnnouncementConfigState} from '../dividend-announcement-config-store';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {getAllDataSources} from '../../../../../store/dividend-announcement/dividend-announcement.selector';
import {DividendAnnouncementDataSourceRead} from '../../../../../gen/api/notification/dividend-announcement';

export function newConfigValuesValid(signalStore: ReadableSignalStore<DividendAnnouncementConfigState>,
                                     globalStore: Store<AppState>): boolean {

  const newConfigValues: DividendAnnouncementConfigParams = signalStore.newConfigValues();
  if (newConfigValues.externalSecurityId.trim().length === 0) {
    return false;
  }

  return globalStore.selectSignal(getAllDataSources)().some((ds: DividendAnnouncementDataSourceRead) => ds.id === newConfigValues.dataSourceId);
}
