import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {KnownDatabase} from '../../../../../bridge/startup-bridge.type';
import {knownDatabasesDisabled} from './known-databases-disabled';

describe('knownDatabasesDisabled', (): void => {
  let knownDatabases: WritableSignal<KnownDatabase[]>;

  beforeEach((): void => {
    knownDatabases = signal<KnownDatabase[]>([]);
  });

  it('is disabled while the app knows no database, as on a first run', (): void => {
    const result: Signal<boolean> = knownDatabasesDisabled({knownDatabases});

    expect(result()).toBe(true);
  });

  it('is enabled as soon as the app knows one', (): void => {
    knownDatabases.set([
      {
        path: 'C:\\Users\\x\\traquity',
        authState: 'scrypt'
      }
    ]);

    const result: Signal<boolean> = knownDatabasesDisabled({knownDatabases});

    expect(result()).toBe(false);
  });
});
