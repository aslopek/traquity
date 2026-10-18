import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {SecurityGroupState} from '../security-group.store';
import {patchState} from '@ngrx/signals';

export function selectSecurityGroup(signalStore: WritableSignalStore<SecurityGroupState>, id: number | 'new' | null): void {
  patchState(signalStore, {selectedSecurityGroupId: id, persistError: null});
}
