import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {UpdateSecurityState} from '../update-security.store';

export function dividendAnnouncementConfigValid(signalStore: ReadableSignalStore<UpdateSecurityState>): boolean {
  return signalStore.dividendAnnouncementConfig() !== null;
}
