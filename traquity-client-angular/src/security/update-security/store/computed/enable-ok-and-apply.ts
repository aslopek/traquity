import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {UpdateSecurityState} from '../update-security.store';
import {masterDataValid} from './master-data-valid';
import {historicalSecurityPriceConfigValid} from './historical-security-price-config-valid';
import {dividendAnnouncementConfigValid} from './dividend-announcement-config-valid';

export function enableOkAndApply(signalStore: ReadableSignalStore<UpdateSecurityState>): boolean {
  // master data
  if (signalStore.masterDataTouched() && !masterDataValid(signalStore)) {
    return false;
  }

  // historical security price config
  if (signalStore.historicalSecurityPriceConfigTouched() && !historicalSecurityPriceConfigValid(signalStore)) {
    return false;
  }

  // dividend announcements config
  if (signalStore.dividendAnnouncementConfigTouched() && !dividendAnnouncementConfigValid(signalStore)) {
    return false;
  }

  // enable if everything that was touched is valid AND at least one section is touched
  return signalStore.masterDataTouched()
    || signalStore.logoTouched()
    || signalStore.historicalSecurityPriceConfigTouched()
    || signalStore.dividendAnnouncementConfigTouched();
}