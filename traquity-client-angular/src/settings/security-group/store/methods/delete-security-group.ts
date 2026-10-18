import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {SecurityGroupState} from '../security-group.store';
import {SecurityGroupApi} from '../../../../gen/api/configuration-security-group';
import {catchError, EMPTY, Observable, take} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {DepotActions} from '../../../../store/depot/depot.actions';

export function deleteSecurityGroup(signalStore: WritableSignalStore<SecurityGroupState>,
                                    securityGroupApi: SecurityGroupApi,
                                    globalStore: Store<AppState>,
                                    id: number): void {
  securityGroupApi.deleteSecurityGroup(id).pipe(
    take(1),
    catchError((): Observable<never> => EMPTY)
  ).subscribe((): void => {
    const selectedSecurityGroupId: number | 'new' | null = signalStore.selectedSecurityGroupId();
    patchState(signalStore, {
      securityGroups: signalStore.securityGroups().filter((securityGroup): boolean => securityGroup.id !== id),
      selectedSecurityGroupId: selectedSecurityGroupId === id ? null : selectedSecurityGroupId
    });
    globalStore.dispatch(DepotActions.reloadDepots());
  });
}
