import {describe, expect, it} from '@jest/globals';
import {signal, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {JavaDownloadProgress, JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {javaValid, JavaValidSlice} from './java-valid';

describe('javaValid', (): void => {
  const okVerification: JavaVerification = {status: 'ok', javaPath: 'C:\\jdk\\bin\\java.exe', versionOutput: 'openjdk 25'};
  const errorVerification: JavaVerification = {status: 'error', message: 'not a JVM'};
  const downloadInProgress: JavaDownloadProgress = {
    phase: 'downloading',
    receivedBytes: 1,
    totalBytes: 2,
    bytesPerSecond: 1,
    secondsRemaining: 1
  };

  function slice(verification: JavaVerification | null, download: JavaDownloadProgress | null): ReadableSignalStore<JavaValidSlice> {
    return {
      javaVerification: signal<JavaVerification | null>(verification),
      javaDownload: signal<JavaDownloadProgress | null>(download)
    };
  }

  it('is valid for an ok verification with no download in progress', (): void => {
    const result: Signal<boolean> = javaValid(slice(okVerification, null));

    expect(result()).toBe(true);
  });

  it('is invalid while no verification has completed yet', (): void => {
    const result: Signal<boolean> = javaValid(slice(null, null));

    expect(result()).toBe(false);
  });

  it('is invalid for an error verification', (): void => {
    const result: Signal<boolean> = javaValid(slice(errorVerification, null));

    expect(result()).toBe(false);
  });

  it('is invalid while a download is in progress, even with a previously ok verification', (): void => {
    const result: Signal<boolean> = javaValid(slice(okVerification, downloadInProgress));

    expect(result()).toBe(false);
  });
});
