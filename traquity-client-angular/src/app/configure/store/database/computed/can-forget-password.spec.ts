import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {AuthState} from '../../../../../bridge/startup-bridge.type';
import {canForgetPassword} from './can-forget-password';

describe('canForgetPassword', (): void => {
  let selectedAuthState: WritableSignal<AuthState>;

  beforeEach((): void => {
    selectedAuthState = signal<AuthState>('scrypt');
  });

  it('can discard a stored scrypt record', (): void => {
    const result: Signal<boolean> = canForgetPassword(selectedAuthState);

    expect(result()).toBe(true);
  });

  it('can discard a stored passwordless marker', (): void => {
    selectedAuthState.set('passwordless');

    const result: Signal<boolean> = canForgetPassword(selectedAuthState);

    expect(result()).toBe(true);
  });

  it('has nothing to discard for a pending database', (): void => {
    selectedAuthState.set('pending');

    const result: Signal<boolean> = canForgetPassword(selectedAuthState);

    expect(result()).toBe(false);
  });
});
