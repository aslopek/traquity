import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {SecurityGroupState} from '../security-group.store';
import {SecurityGroupApi, SecurityGroupRead} from '../../../../gen/api/configuration-security-group';
import {catchError, EMPTY, Observable, take} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {HttpErrorResponse} from '@angular/common/http';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {DepotActions} from '../../../../store/depot/depot.actions';

export function createSecurityGroup(signalStore: WritableSignalStore<SecurityGroupState>,
                                    securityGroupApi: SecurityGroupApi,
                                    globalStore: Store<AppState>,
                                    name: string,
                                    securities: number[]): void {
  securityGroupApi.createSecurityGroup({name, securities}).pipe(
    take(1),
    catchError((error: HttpErrorResponse): Observable<never> => {
      patchState(signalStore, {persistError: error.status === 409 ? 'conflict' : 'bad-request'});
      return EMPTY;
    })
  ).subscribe((created: SecurityGroupRead): void => {
    patchState(signalStore, {
      securityGroups: [...signalStore.securityGroups(), created],
      selectedSecurityGroupId: created.id,
      persistError: null
    });
    globalStore.dispatch(DepotActions.reloadDepots());
  });
}
