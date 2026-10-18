import {DepotState} from '../../depot.state';

export type GetUseDividendGrossValuesState = {
  dividend: Pick<DepotState['dividend'], 'useGrossValues'>
};

export function getUseDividendGrossValues(state: GetUseDividendGrossValuesState): boolean {
  return state.dividend.useGrossValues;
}
