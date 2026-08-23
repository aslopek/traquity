import {beforeEach, describe, expect, it} from '@jest/globals';
import {KnownDatabase} from '../../../bridge/startup-bridge.type';
import {authStateIn} from './known-databases';

describe('authStateIn', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';
  const otherDatabasePath: string = 'D:\\backup\\traquity-test';

  let knownDatabases: KnownDatabase[];

  beforeEach((): void => {
    knownDatabases = [
      {
        path: databasePath,
        authState: 'scrypt'
      },
      {
        path: otherDatabasePath,
        authState: 'passwordless'
      }
    ];
  });

  it('reports the state the list carries for the database', (): void => {
    expect(authStateIn(knownDatabases, databasePath)).toBe('scrypt');
  });

  it('reports the state of the database it is asked for, not of the first one', (): void => {
    expect(authStateIn(knownDatabases, otherDatabasePath)).toBe('passwordless');
  });

  it('reports a database that is not in the list as pending', (): void => {
    expect(authStateIn(knownDatabases, 'E:\\fresh')).toBe('pending');
  });

  it('reports no database at all as pending', (): void => {
    expect(authStateIn(knownDatabases, null)).toBe('pending');
  });

  it('reports pending against an empty list', (): void => {
    expect(authStateIn([], databasePath)).toBe('pending');
  });
});
