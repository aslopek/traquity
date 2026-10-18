import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {SecurityGroupState} from '../security-group.store';
import {SecurityGroupApi, SecurityGroupRead} from '../../../../gen/api/configuration-security-group';
import {catchError, EMPTY, Observable, take} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {HttpErrorResponse} from '@angular/common/http';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {DepotActions} from '../../../../store/depot/depot.actions';

export function updateSecurityGroup(signalStore: WritableSignalStore<SecurityGroupState>,
                                    securityGroupApi: SecurityGroupApi,
                                    globalStore: Store<AppState>,
                                    id: number,
                                    version: number,
                                    name: string,
                                    securities: number[]): void {
  securityGroupApi.updateSecurityGroup(id, {name, securities, version}).pipe(
    take(1),
    catchError((error: HttpErrorResponse): Observable<never> => {
      patchState(signalStore, {persistError: error.status === 409 ? 'conflict' : 'bad-request'});
      return EMPTY;
    })
  ).subscribe((updated: SecurityGroupRead): void => {
    patchState(signalStore, {
      securityGroups: signalStore.securityGroups().map(
        (securityGroup: SecurityGroupRead): SecurityGroupRead => securityGroup.id === updated.id ? updated : securityGroup
      ),
      persistError: null
    });
    globalStore.dispatch(DepotActions.reloadDepots());
  });
}
