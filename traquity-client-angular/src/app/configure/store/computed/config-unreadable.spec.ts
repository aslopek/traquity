import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {ConfigFileState} from '../../../../bridge/startup-bridge.type';
import {configUnreadable} from './config-unreadable';

describe('configUnreadable', (): void => {
  let configFileState: WritableSignal<ConfigFileState>;

  beforeEach((): void => {
    configFileState = signal<ConfigFileState>('read');
  });

  it('reports false for a config file that was successfully read', (): void => {
    const result: Signal<boolean> = configUnreadable({configFileState});

    expect(result()).toBe(false);
  });

  it('reports true for a config file that could not be read', (): void => {
    configFileState.set('unreadable');

    const result: Signal<boolean> = configUnreadable({configFileState});

    expect(result()).toBe(true);
  });

  it('reports false for a missing config file', (): void => {
    configFileState.set('missing');

    const result: Signal<boolean> = configUnreadable({configFileState});

    expect(result()).toBe(false);
  });
});
