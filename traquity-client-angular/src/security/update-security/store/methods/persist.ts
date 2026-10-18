import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {UpdateSecurityComputed, UpdateSecurityState} from '../update-security.store';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {SecurityCreate} from '../../../../gen/api/security';
import {SecurityActions, UpdateSecurityActionArgs} from '../../../../store/security/security.actions';
import {HistoricalSecurityPriceConfigCreate} from '../../../../gen/api/historical-security-price';
import {setUntouched} from './set-untouched';
import {DividendAnnouncementConfigApi} from '../../../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementConfigChangedEvent} from '../../../details/dividend-announcement/dividend-announcement-config.component';
import {catchError, EMPTY, Observable, take} from 'rxjs';

export function persist(signalStore: WritableSignalStore<UpdateSecurityState, UpdateSecurityComputed>,
                        globalStore: Store<AppState>,
                        dividendAnnouncementConfigApi: DividendAnnouncementConfigApi): void {
  const securityId: number | null = signalStore.securityId();
  if (securityId === null) {
    return;
  }

  const masterData: SecurityCreate | null = signalStore.masterData();
  if (masterData !== null) {
    globalStore.dispatch(SecurityActions.updateSecurity({
      id: securityId,
      values: masterData
    } satisfies UpdateSecurityActionArgs));
  }

  const logo: File | null = signalStore.logo();
  if (logo !== null) {
    globalStore.dispatch(SecurityActions.updateSecurityLogo({
      id: securityId,
      logo
    }));
  }

  const historicalSecurityPriceConfigTouched: boolean = signalStore.historicalSecurityPriceConfigTouched();
  const historicalSecurityPriceConfig: HistoricalSecurityPriceConfigCreate | null = signalStore.historicalSecurityPriceConfig();
  if (historicalSecurityPriceConfigTouched && historicalSecurityPriceConfig !== null) {
    globalStore.dispatch(SecurityActions.updateHistoricalSecurityPriceConfig({
      securityId,
      historicalSecurityPriceConfig
    }));
  }

  const dividendAnnouncementConfigTouched: boolean = signalStore.dividendAnnouncementConfigTouched();
  const dividendAnnouncementConfig: DividendAnnouncementConfigChangedEvent | null = signalStore.dividendAnnouncementConfig();

  if (dividendAnnouncementConfigTouched && dividendAnnouncementConfig !== null) {
    const version: number | null = dividendAnnouncementConfig.version;
    if (version === null) {
      dividendAnnouncementConfigApi.createDividendAnnouncementConfig(securityId, dividendAnnouncementConfig).pipe(
        take(1),
        catchError((): Observable<never> => EMPTY)
      ).subscribe();
    } else {
      dividendAnnouncementConfigApi.updateDividendAnnouncementConfig(securityId, {
        ...dividendAnnouncementConfig,
        version
      }).pipe(
        take(1),
        catchError((): Observable<never> => EMPTY)
      ).subscribe();
    }
  }

  setUntouched(signalStore);
}
