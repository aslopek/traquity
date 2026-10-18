import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {DividendAnnouncementConfigState} from '../dividend-announcement-config-store';
import {
  DividendAnnouncementConfigApi,
  DividendAnnouncementConfigRead,
  DividendAnnouncementDataSourceRead
} from '../../../../../gen/api/notification/dividend-announcement';
import {catchError, of, take} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {getAllDataSources} from '../../../../../store/dividend-announcement/dividend-announcement.selector';

export function loadDividendAnnouncementConfig(signalStore: WritableSignalStore<DividendAnnouncementConfigState>,
                                               globalStore: Store<AppState>,
                                               api: DividendAnnouncementConfigApi,
                                               securityId: number): void {
  const dataSources: DividendAnnouncementDataSourceRead[] = globalStore.selectSignal(getAllDataSources)();
  if (dataSources.length === 0) {
    return;
  }

  api.getDividendAnnouncementConfig(securityId).pipe(
    take(1),
    catchError(() => {
      return of(null);
    })).subscribe((result: DividendAnnouncementConfigRead | null) => {
    if (result == null) {
      patchState(signalStore, {
        securityId,
        isDirty: false,
        existingConfig: null,
        newConfigValues: {
          dataSourceId: dataSources[0].id,
          externalSecurityId: '',
          isActive: true
        }
      });
    } else {
      patchState(signalStore, {
        securityId,
        isDirty: false,
        existingConfig: result,
        newConfigValues: result
      })
    }
  });
}
