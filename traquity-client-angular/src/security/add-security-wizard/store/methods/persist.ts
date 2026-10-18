import {AddSecurityWizardComputed, AddSecurityWizardState} from '../add-security-wizard.store';
import {Store} from '@ngrx/store';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {AppState} from '../../../../store/app.state';
import {SecurityActions} from '../../../../store/security/security.actions';
import {SecurityCreate} from '../../../../gen/api/security';
import {HistoricalSecurityPriceConfigCreate} from '../../../../gen/api/historical-security-price';
import {DividendAnnouncementConfigCreate} from '../../../../gen/api/notification/dividend-announcement';

export function persist(signalStore: ReadableSignalStore<AddSecurityWizardState, AddSecurityWizardComputed>, globalStore: Store<AppState>): void {
  const masterData: SecurityCreate | null = signalStore.masterData();
  const logo: File | null = signalStore.logo();
  const historicalSecurityPriceConfig: HistoricalSecurityPriceConfigCreate | null = signalStore.historicalSecurityPriceConfig();
  const dividendAnnouncementConfig: DividendAnnouncementConfigCreate | null = signalStore.dividendAnnouncementConfig();

  if (masterData != null && signalStore.allStepsOk()) {
    globalStore.dispatch(SecurityActions.createSecurity({
      security: masterData,
      logo: logo ?? undefined,
      historicalSecurityPriceConfig: historicalSecurityPriceConfig ?? undefined,
      dividendAnnouncementConfig: dividendAnnouncementConfig ?? undefined
    }));
  }
}
