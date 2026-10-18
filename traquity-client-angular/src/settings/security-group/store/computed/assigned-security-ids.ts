import {computed, Signal} from '@angular/core';
import {SecurityGroupRead} from '../../../../gen/api/configuration-security-group';
import {SecurityGroupState} from '../security-group.store';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';

export function assignedSecurityIds(signalStore: ReadableSignalStore<SecurityGroupState>): Signal<Set<number>> {
  const selectedSecurityGroupIdSignal: Signal<number | 'new' | null> = signalStore.selectedSecurityGroupId;
  const securityGroups: Signal<SecurityGroupRead[]> = signalStore.securityGroups;

  return computed<Set<number>>((): Set<number> => {
    const selectedSecurityGroupId: number | 'new' | null = selectedSecurityGroupIdSignal();
    const ids: Set<number> = new Set<number>();
    for (const securityGroup of securityGroups()) {
      if (securityGroup.id === selectedSecurityGroupId) {
        continue;
      }
      for (const securityId of securityGroup.securities) {
        ids.add(securityId);
      }
    }
    return ids;
  });
}
