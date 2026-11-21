import {RxMethod, rxMethod} from '@ngrx/signals/rxjs-interop';
import {Store} from '@ngrx/store';
import {Observable, pipe, retry, switchMap, tap} from 'rxjs';
import {AdminApi} from '../../../../gen/api/admin';
import {AppActions} from '../../../../store/app.actions';
import {AppState} from '../../../../store/app.state';

const backendRetryDelayInMilliseconds: number = 500;

export function waitForBackend(globalStore: Pick<Store<AppState>, 'dispatch'>, adminApi: Pick<AdminApi, 'getPid'>): RxMethod<void> {
  return rxMethod<void>(waitForBackendPipe(globalStore, adminApi));
}

/**
 * Required only for development: probes the backend when the frontend was not started from the packaged app.
 */
export function waitForBackendPipe(globalStore: Pick<Store<AppState>, 'dispatch'>,
                                   adminApi: Pick<AdminApi, 'getPid'>): (source$: Observable<void>) => Observable<number> {
  return pipe(
    switchMap((): Observable<number> => adminApi.getPid().pipe(
      retry({delay: backendRetryDelayInMilliseconds})
    )),
    tap((): void => globalStore.dispatch(AppActions.initialize()))
  );
}
