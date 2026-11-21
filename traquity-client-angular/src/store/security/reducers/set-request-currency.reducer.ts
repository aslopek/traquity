import {SecurityState} from '../security.state';
import {SetRequestCurrencyActionArgs} from '../security.actions';

export function setRequestCurrency(state: SecurityState, args: SetRequestCurrencyActionArgs): SecurityState {
  return {
    ...state,
    requestCurrency: args.currency
  };
}
