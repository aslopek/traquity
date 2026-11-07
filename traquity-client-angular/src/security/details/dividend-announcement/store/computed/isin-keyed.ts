import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {DividendAnnouncementConfigState} from '../dividend-announcement-config-store';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {getAllDataSources} from '../../../../../store/dividend-announcement/dividend-announcement.selector';
import {DividendAnnouncementDataSourceRead} from '../../../../../gen/api/notification/dividend-announcement';
import {isIsinKeyed} from '../../../../../settings/data-source/is-isin-keyed';

export type IsinKeyedState = Pick<DividendAnnouncementConfigState, 'newConfigValues'>;

export function isinKeyed(
  signalStore: ReadableSignalStore<IsinKeyedState>,
  globalStore: Store<AppState>
): boolean {
  const dataSourceId: number = signalStore.newConfigValues().dataSourceId;
  return isIsinKeyed(globalStore.selectSignal(getAllDataSources)()
    .find((ds: DividendAnnouncementDataSourceRead): boolean => ds.id === dataSourceId));
}
