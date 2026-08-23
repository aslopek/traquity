import {computed, Signal} from "@angular/core";
import {AuthState} from "../../../../../bridge/startup-bridge.type";

/**
 * Whether there is a stored password record to discard: discarding only ever *removes* an entry. `pending` databases can therefore not be
 * 'forgotten'.
 */
export function canForgetPassword(selectedAuthState: Signal<AuthState>): Signal<boolean> {
  return computed((): boolean => selectedAuthState() !== 'pending');
}
