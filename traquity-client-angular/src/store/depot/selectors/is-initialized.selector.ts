import {DepotState} from '../depot.state';

export type IsInitializedState = Pick<DepotState, 'initialized'>;

export function isInitialized(state: IsInitializedState): boolean {
  return state.initialized;
}
