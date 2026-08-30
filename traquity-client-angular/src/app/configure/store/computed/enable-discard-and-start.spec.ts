import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {ConfigFileState} from '../../../../bridge/startup-bridge.type';
import {enableDiscardAndStart} from './enable-discard-and-start';

describe('enableDiscardAndStart', (): void => {
  let configFileState: WritableSignal<ConfigFileState>;
  let databasePath: WritableSignal<string | null>;

  beforeEach((): void => {
    configFileState = signal<ConfigFileState>('read');
    databasePath = signal<string | null>('C:\\Users\\x\\traquity');
  });

  it('is enabled for a config that was successfully read and names a database', (): void => {
    const result: Signal<boolean> = enableDiscardAndStart({configFileState}, {databasePath});

    expect(result()).toBe(true);
  });

  it('is disabled on a true first run, where no config file exists', (): void => {
    configFileState.set('missing');

    const result: Signal<boolean> = enableDiscardAndStart({configFileState}, {databasePath});

    expect(result()).toBe(false);
  });

  it('is disabled when the config file could not be successfully read', (): void => {
    configFileState.set('unreadable');

    const result: Signal<boolean> = enableDiscardAndStart({configFileState}, {databasePath});

    expect(result()).toBe(false);
  });

  it('is disabled when the config that was read names no database', (): void => {
    databasePath.set(null);

    const result: Signal<boolean> = enableDiscardAndStart({configFileState}, {databasePath});

    expect(result()).toBe(false);
  });
});
