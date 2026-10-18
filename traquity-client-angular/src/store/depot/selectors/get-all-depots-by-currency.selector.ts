import {DepotState} from '../depot.state';
import {DepotRead} from '../../../gen/api/depot';

export type GetAllDepotsByCurrencyState = Pick<DepotState, 'depots'>;
export type DepotsByCurrency = { [currency: string]: DepotRead[] };

export function getAllDepotsByCurrency(state: GetAllDepotsByCurrencyState): DepotsByCurrency {
  const result: DepotsByCurrency = {};
  for (const depot of state.depots) {
    if (result[depot.currency] === undefined) {
      result[depot.currency] = [];
    }
    result[depot.currency].push(depot);
  }
  return result;
}
