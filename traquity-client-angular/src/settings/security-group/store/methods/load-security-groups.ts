import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {SecurityGroupState} from '../security-group.store';
import {SecurityGroupApi, SecurityGroupRead} from '../../../../gen/api/configuration-security-group';
import {catchError, EMPTY, Observable, take} from 'rxjs';
import {patchState} from '@ngrx/signals';

export function loadSecurityGroups(signalStore: WritableSignalStore<SecurityGroupState>, securityGroupApi: SecurityGroupApi): void {
  securityGroupApi.getSecurityGroups().pipe(
    take(1),
    catchError((): Observable<never> => EMPTY)
  ).subscribe((securityGroups: SecurityGroupRead[]): void => {
    patchState(signalStore, {securityGroups});
  });
}
