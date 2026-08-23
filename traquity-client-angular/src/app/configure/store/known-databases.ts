import {AuthState, KnownDatabase} from "../../../bridge/startup-bridge.type";

/**
 * The password state of a database, looked up in the list of the ones the app knows.
 *
 * A lookup on the list passed in, deliberately, rather than a second copy of that state kept somewhere: the answer is
 * as fresh as the list and there is nothing to invalidate when the list changes.
 *
 * A database that is not in the list is `pending`: the app knows nothing about its password, which is exactly what a
 * missing `auth` entry means.
 */
export function authStateIn(knownDatabases: KnownDatabase[], databasePath: string | null): AuthState {
  if (databasePath == null) {
    return 'pending';
  }
  return knownDatabases.find((known: KnownDatabase): boolean => known.path === databasePath)?.authState ?? 'pending';
}
