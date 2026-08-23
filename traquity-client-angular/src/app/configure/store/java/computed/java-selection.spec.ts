import {describe, expect, it} from '@jest/globals';
import {signal, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {javaSelection, JavaSelection, JavaSelectionSlice} from './java-selection';

describe('javaSelection', (): void => {
  const javaPath: string = 'C:\\jdk\\bin\\java.exe';
  const okVerification: JavaVerification = {status: 'ok', javaPath, versionOutput: 'openjdk 25'};
  const errorVerification: JavaVerification = {status: 'error', message: 'not a JVM'};

  function slice(path: string | null, verification: JavaVerification | null): ReadableSignalStore<JavaSelectionSlice> {
    return {
      javaPath: signal<string | null>(path),
      javaVerification: signal<JavaVerification | null>(verification)
    };
  }

  it('selects automatic for a null path with an ok verification', (): void => {
    const result: Signal<JavaSelection> = javaSelection(slice(null, okVerification));

    expect(result()).toBe('automatic');
  });

  it('selects custom for a set path with an ok verification', (): void => {
    const result: Signal<JavaSelection> = javaSelection(slice(javaPath, okVerification));

    expect(result()).toBe('custom');
  });

  it('selects nothing for a null path with an error verification', (): void => {
    const result: Signal<JavaSelection> = javaSelection(slice(null, errorVerification));

    expect(result()).toBeNull();
  });

  it('selects nothing for a set path with an error verification', (): void => {
    const result: Signal<JavaSelection> = javaSelection(slice(javaPath, errorVerification));

    expect(result()).toBeNull();
  });

  it('selects nothing while no verification has answered yet and no path is set', (): void => {
    const result: Signal<JavaSelection> = javaSelection(slice(null, null));

    expect(result()).toBeNull();
  });

  it('selects nothing while no verification has answered yet for a set path', (): void => {
    const result: Signal<JavaSelection> = javaSelection(slice(javaPath, null));

    expect(result()).toBeNull();
  });
});
