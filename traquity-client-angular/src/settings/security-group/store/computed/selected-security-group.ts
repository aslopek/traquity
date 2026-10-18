import {computed, Signal} from '@angular/core';
import {SecurityGroupRead} from '../../../../gen/api/configuration-security-group';
import {SecurityGroupState} from '../security-group.store';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';

export function selectedSecurityGroup(signalStore: ReadableSignalStore<SecurityGroupState>): Signal<SecurityGroupRead | null> {
  const selectedSecurityGroupIdSignal: Signal<number | 'new' | null> = signalStore.selectedSecurityGroupId;
  const securityGroups: Signal<SecurityGroupRead[]> = signalStore.securityGroups;

  return computed<SecurityGroupRead | null>((): SecurityGroupRead | null => {
    const selectedSecurityGroupId: number | 'new' | null = selectedSecurityGroupIdSignal();
    if (selectedSecurityGroupId === null || selectedSecurityGroupId === 'new') {
      return null;
    }
    for (const securityGroup of securityGroups()) {
      if (securityGroup.id === selectedSecurityGroupId) {
        return securityGroup;
      }
    }
    return null;
  });
}
