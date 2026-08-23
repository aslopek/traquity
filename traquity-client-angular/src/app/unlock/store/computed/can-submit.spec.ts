import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {AuthState} from '../../../../bridge/startup-bridge.type';
import {canSubmit} from './can-submit';

describe('canSubmit', (): void => {
  let passwordMatches: WritableSignal<boolean>;
  let authState: WritableSignal<AuthState | null>;

  beforeEach((): void => {
    passwordMatches = signal<boolean>(false);
    authState = signal<AuthState | null>('pending');
  });

  it('is enabled for a pending auth state regardless of a match', (): void => {
    const result: Signal<boolean> = canSubmit({passwordMatches}, {authState});

    expect(result()).toBe(true);
  });

  it('is enabled when the auth state is null', (): void => {
    authState.set(null);

    const result: Signal<boolean> = canSubmit({passwordMatches}, {authState});

    expect(result()).toBe(true);
  });

  describe('when the auth state is scrypt', (): void => {
    beforeEach((): void => {
      authState.set('scrypt');
    });

    it('is disabled when the password does not match', (): void => {
      const result: Signal<boolean> = canSubmit({passwordMatches}, {authState});

      expect(result()).toBe(false);
    });

    it('is enabled when the password matches', (): void => {
      passwordMatches.set(true);

      const result: Signal<boolean> = canSubmit({passwordMatches}, {authState});

      expect(result()).toBe(true);
    });
  });
});
