import {SecurityRead} from '../../../gen/api/security';
import {SecurityState} from '../security.state';

export type SecuritiesByIsin = { [isin: string]: SecurityRead };

/**
 * The securities this app knows, keyed by their ISIN. An ISIN identifies a security exactly, which is what makes it
 * the key: two securities cannot share one, and a lookup that misses means the security is genuinely unknown.
 */
export function getSecuritiesByIsinSelector(state: Pick<SecurityState, 'securities'>): SecuritiesByIsin {
  const securitiesByIsin: SecuritiesByIsin = {};
  for (const security of Object.values(state.securities)) {
    const securityRead: SecurityRead = security;
    securitiesByIsin[securityRead.isin] = securityRead;
  }
  return securitiesByIsin;
}
