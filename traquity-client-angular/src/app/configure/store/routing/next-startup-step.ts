import {AuthState} from "../../../../bridge/startup-bridge.type";

/** Where the currently selected database came from. */
export type SelectionOrigin = 'unchanged' | 'created' | 'picked' | 'known';

export type StartupStep = { action: 'start', password: string } | { action: 'unlock' };

/**
 * The single place the step following a configuration is decided: a database whose password was just defined starts
 * the backend with it, a `passwordless` one starts without any, and every other one has to prove its password first.
 */
export function nextStartupStep(origin: SelectionOrigin, authState: AuthState, definedPassword?: string): StartupStep {
  if (origin === 'created' && definedPassword != null) {
    return {action: 'start', password: definedPassword};
  }
  return authState === 'passwordless' ? {action: 'start', password: ''} : {action: 'unlock'};
}
