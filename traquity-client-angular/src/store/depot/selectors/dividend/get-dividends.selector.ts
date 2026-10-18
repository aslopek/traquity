import {DepotState} from '../../depot.state';
import {Dividends} from '../../../../gen/api/depot-dividend';

export type GetDividendsState = {
  dividend: Pick<DepotState['dividend'], 'dividends'>
};

export function getDividends(state: GetDividendsState): Dividends | null {
  return state.dividend.dividends;
}
