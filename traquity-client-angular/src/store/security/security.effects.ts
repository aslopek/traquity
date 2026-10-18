import {inject, Injectable} from '@angular/core';
import {Actions, createEffect} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {SecurityApi, SecurityLogoApi} from '../../gen/api/security';
import {createSecurity} from './effects/create-security.effect';
import {loadAllSecurities, LoadAllSecuritiesEffectArgs} from './effects/load-all-securities.effect';
import {updateSecurity, UpdateSecurityEffectArgs} from './effects/update-security.effect';
import {loadSecurity} from './effects/load-security.effect';
import {AppState} from '../app.state';
import {updateSecurityLogo} from './effects/update-security-logo.effect';
import {HistoricalSecurityPriceConfigApi, HistoricalSecurityPriceDataSourceApi} from '../../gen/api/historical-security-price';
import {loadHistoricalSecurityPriceConfig} from './effects/load-historical-security-price-config.effect';
import {updateHistoricalSecurityPriceConfigEffect} from './effects/update-historical-security-price-config.effect';
import {DividendAnnouncementConfigApi} from '../../gen/api/notification/dividend-announcement';
import {
  loadHistoricalSecurityPriceDataSources,
  LoadHistoricalSecurityPriceDataSourcesEffectArgs
} from './effects/load-historical-security-price-data-sources.effect';
import {
  setHistoricalSecurityPriceDataSource,
  SetHistoricalSecurityPriceDataSourceEffectArgs
} from './effects/set-historical-security-price-data-source.effect';
import {
  deleteHistoricalSecurityPriceDataSource,
  DeleteHistoricalSecurityPriceDataSourceEffectArgs
} from './effects/delete-historical-security-price-data-source.effect';
import {loadSecuritiesOn, LoadSecuritiesOnEffectArgs} from './effects/load-securities-on.effect';

@Injectable()
export class SecurityEffects {

  private readonly store: Store<AppState> = inject(Store);
  private readonly actions$: Actions = inject(Actions);
  private readonly securityApi: SecurityApi = inject(SecurityApi);
  private readonly securityLogoApi: SecurityLogoApi = inject(SecurityLogoApi);
  private readonly historicalSecurityPriceConfigApi: HistoricalSecurityPriceConfigApi = inject(HistoricalSecurityPriceConfigApi);
  private readonly historicalSecurityPriceDataSourceApi: HistoricalSecurityPriceDataSourceApi = inject(HistoricalSecurityPriceDataSourceApi);
  private readonly dividendAnnouncementConfigApi: DividendAnnouncementConfigApi = inject(DividendAnnouncementConfigApi);

  readonly loadAllSecurities = createEffect(() => loadAllSecurities({
    actions$: this.actions$,
    securityApi: this.securityApi
  } satisfies LoadAllSecuritiesEffectArgs));

  readonly createSecurity = createEffect(() => createSecurity({
    actions$: this.actions$,
    securityApi: this.securityApi,
    securityLogoApi: this.securityLogoApi,
    dividendAnnouncementConfigApi: this.dividendAnnouncementConfigApi
  }));

  readonly loadSecurity = createEffect(() => loadSecurity(this.actions$, {
    securityApi: this.securityApi,
    store: this.store
  }));

  readonly updateSecurity = createEffect(() => updateSecurity(this.actions$, {
    store: this.store,
    securityApi: this.securityApi
  } satisfies UpdateSecurityEffectArgs));

  readonly updateSecurityLogo = createEffect(() => updateSecurityLogo(this.actions$, {
    store: this.store,
    securityLogoApi: this.securityLogoApi
  }));

  readonly loadHistoricalSecurityPriceConfig = createEffect(() => loadHistoricalSecurityPriceConfig(this.actions$, {
    store: this.store,
    historicalSecurityPriceConfigApi: this.historicalSecurityPriceConfigApi
  }));

  readonly updateHistoricalSecurityPriceConfig = createEffect(() => updateHistoricalSecurityPriceConfigEffect(this.actions$, {
    store: this.store,
    historicalSecurityPriceConfigApi: this.historicalSecurityPriceConfigApi
  }));

  readonly loadHistoricalSecurityPriceDataSources = createEffect(() => loadHistoricalSecurityPriceDataSources({
    actions$: this.actions$,
    api: this.historicalSecurityPriceDataSourceApi,
    store: this.store
  } satisfies LoadHistoricalSecurityPriceDataSourcesEffectArgs));

  readonly setHistoricalSecurityPriceDataSources = createEffect(() => setHistoricalSecurityPriceDataSource({
    actions$: this.actions$,
    api: this.historicalSecurityPriceDataSourceApi,
    store: this.store
  } satisfies SetHistoricalSecurityPriceDataSourceEffectArgs));

  readonly deleteHistoricalSecurityPriceDataSource = createEffect(() => deleteHistoricalSecurityPriceDataSource({
    actions$: this.actions$,
    api: this.historicalSecurityPriceDataSourceApi,
    store: this.store
  } satisfies DeleteHistoricalSecurityPriceDataSourceEffectArgs));

  readonly loadSecuritiesOn = createEffect(() => loadSecuritiesOn({
    actions$: this.actions$
  } satisfies LoadSecuritiesOnEffectArgs));
}
