import {SecurityRead} from '../../gen/api/security';
import {HistoricalSecurityPriceConfigRead} from '../../gen/api/historical-security-price';
import {DataSourceWithId} from '../../settings/data-source/data-source.type';

export type SecuritiesById = { [id: number]: SecurityRead };
export type HistoricalSecurityPriceConfigs = { [id: number]: HistoricalSecurityPriceConfigRead };

export type SecurityState = {
  /**
   * @see architecture/ui-state-management.md, ADR-001
   */
  requestCurrency: string | null
  securities: SecuritiesById
  historicalSecurityPriceConfigs: HistoricalSecurityPriceConfigs
  historicalSecurityPriceDataSources: DataSourceWithId[]
};
