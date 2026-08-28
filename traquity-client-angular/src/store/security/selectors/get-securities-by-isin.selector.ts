import {SecurityRead} from '../../../gen/api/security';
import {SecurityState} from '../security.state';

export type SecuritiesByIsin = { [isin: string]: SecurityRead };

export function getSecuritiesByIsinSelector(state: Pick<SecurityState, 'securities'>): SecuritiesByIsin {
  const securitiesByIsin: SecuritiesByIsin = {};
  for (const security of Object.values(state.securities)) {
    securitiesByIsin[security.isin] = security;
  }
  return securitiesByIsin;
}
