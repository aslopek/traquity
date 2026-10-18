import {SecurityGroupApi, SecurityGroupRead} from '../../../gen/api/configuration-security-group';
import {ReadableSignalStore, WritableSignalStore} from '../../../common/types/signal-store.type';
import {signalStore, withComputed, withHooks, withMethods, withState} from '@ngrx/signals';
import {inject, Signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../../store/app.state';
import {selectedSecurityGroup} from './computed/selected-security-group';
import {assignedSecurityIds} from './computed/assigned-security-ids';
import {loadSecurityGroups} from './methods/load-security-groups';
import {selectSecurityGroup} from './methods/select-security-group';
import {createSecurityGroup} from './methods/create-security-group';
import {updateSecurityGroup} from './methods/update-security-group';
import {deleteSecurityGroup} from './methods/delete-security-group';
import {SecurityActions} from '../../../store/security/security.actions';

export type SecurityGroupComputed = {
  assignedSecurityIds: Signal<Set<number>>
  selectedSecurityGroup: Signal<SecurityGroupRead | null>
};

export type SecurityGroupMethods = {
  createSecurityGroup: (name: string, securities: number[]) => void
  deleteSecurityGroup: (id: number) => void
  loadSecurityGroups: () => void
  selectSecurityGroup: (id: number | 'new' | null) => void
  updateSecurityGroup: (id: number, version: number, name: string, securities: number[]) => void
};

export type SecurityGroupState = {
  persistError: 'conflict' | 'bad-request' | null
  securityGroups: SecurityGroupRead[]
  selectedSecurityGroupId: number | 'new' | null
};

const initialState: SecurityGroupState = {
  persistError: null,
  securityGroups: [],
  selectedSecurityGroupId: null
} as const;

export type ReadableSecurityGroupStore = ReadableSignalStore<SecurityGroupState, SecurityGroupComputed, SecurityGroupMethods>;

export const SecurityGroupStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<SecurityGroupState>): SecurityGroupComputed => {
    return {
      assignedSecurityIds: assignedSecurityIds(signalStore),
      selectedSecurityGroup: selectedSecurityGroup(signalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<SecurityGroupState, SecurityGroupComputed>,
               securityGroupApi: SecurityGroupApi = inject(SecurityGroupApi),
               globalStore: Store<AppState> = inject(Store)): SecurityGroupMethods => {
    return {
      createSecurityGroup: (name: string, securities: number[]): void =>
        createSecurityGroup(signalStore, securityGroupApi, globalStore, name, securities),
      deleteSecurityGroup: (id: number): void => deleteSecurityGroup(signalStore, securityGroupApi, globalStore, id),
      loadSecurityGroups: (): void => loadSecurityGroups(signalStore, securityGroupApi),
      selectSecurityGroup: (id: number | 'new' | null): void => selectSecurityGroup(signalStore, id),
      updateSecurityGroup: (id: number, version: number, name: string, securities: number[]): void =>
        updateSecurityGroup(signalStore, securityGroupApi, globalStore, id, version, name, securities)
    };
  }),
  withHooks({
    onInit(signalStore: WritableSignalStore<SecurityGroupState, SecurityGroupComputed, SecurityGroupMethods>): void {
      const globalStore: Store<AppState> = inject(Store);
      signalStore.loadSecurityGroups();
      globalStore.dispatch(SecurityActions.loadAllSecurities());
    }
  })
);
