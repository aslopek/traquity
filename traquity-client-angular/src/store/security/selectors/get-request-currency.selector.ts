import {SecurityState} from '../security.state';

export type GetRequestCurrencyState = Pick<SecurityState, 'requestCurrency'>

export function getRequestCurrencySelector(state: GetRequestCurrencyState): string | null {
  return state.requestCurrency;
}
