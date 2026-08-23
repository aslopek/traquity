import {describe, expect, it} from '@jest/globals';
import {signal, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {javaVerifying, JavaVerifyingSlice} from './java-verifying';

describe('javaVerifying', (): void => {
  function slice(verification: JavaVerification | null): ReadableSignalStore<JavaVerifyingSlice> {
    return {javaVerification: signal<JavaVerification | null>(verification)};
  }

  it('is verifying while no verification has completed yet', (): void => {
    const result: Signal<boolean> = javaVerifying(slice(null));

    expect(result()).toBe(true);
  });

  it('is not verifying once an ok verification has arrived', (): void => {
    const result: Signal<boolean> = javaVerifying(slice({status: 'ok', javaPath: 'C:\\jdk\\bin\\java.exe', versionOutput: 'openjdk 25'}));

    expect(result()).toBe(false);
  });

  it('is not verifying once an error verification has arrived', (): void => {
    const result: Signal<boolean> = javaVerifying(slice({status: 'error', message: 'not a JVM'}));

    expect(result()).toBe(false);
  });
});
