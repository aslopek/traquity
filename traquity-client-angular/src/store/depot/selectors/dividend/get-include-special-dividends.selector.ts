import {DepotState} from '../../depot.state';

export type GetIncludeSpecialDividendsState = {
  dividend: Pick<DepotState['dividend'], 'includeSpecialDividends'>
};

export function getIncludeSpecialDividends(state: GetIncludeSpecialDividendsState): boolean {
  return state.dividend.includeSpecialDividends;
}
