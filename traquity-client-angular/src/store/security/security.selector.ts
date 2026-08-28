import {createFeatureSelector, createSelector, MemoizedSelector} from '@ngrx/store';
import {SecurityRead} from '../../gen/api/security';
import {HistoricalSecurityPriceConfigs, SecuritiesById, SecurityState} from './security.state';
import {getSecurityByIdSelector} from './selectors/get-security-by-id.selector';
import {AppState} from '../app.state';
import {getSecuritiesByIdSelector} from './selectors/get-securities-by-id.selector';
import {getSecurityIdsByNameSelector} from './selectors/get-security-ids-by-name.selector';
import {getSecuritiesByIsinSelector, SecuritiesByIsin} from './selectors/get-securities-by-isin.selector';
import {HistoricalSecurityPriceConfigRead} from '../../gen/api/historical-security-price';
import {getHistoricalSecurityPriceConfigSelector} from './selectors/get-historical-security-price-config.selector';
import {getHistoricalSecurityPriceConfigsSelector} from './selectors/get-historical-security-price-configs.selector';
import {DataSourceWithId} from "../../settings/data-source/data-source.type";
import {getHistoricalSecurityPriceDataSourcesSelector} from "./selectors/get-historical-security-price-data-sources.selector";
import {getHistoricalSecurityPriceDataSourceSelector} from "./selectors/get-historical-security-price-data-source.selector";

export const securityStore = 'security';

const securitySelector: MemoizedSelector<AppState, SecurityState>
  = createFeatureSelector<SecurityState>(securityStore);

export const securitiesById: MemoizedSelector<AppState, SecuritiesById>
  = createSelector(securitySelector, getSecuritiesByIdSelector);

export const securitiesByIsin: MemoizedSelector<AppState, SecuritiesByIsin>
  = createSelector(securitySelector, getSecuritiesByIsinSelector);

export const securityIdsByName: MemoizedSelector<AppState, { [securityName: string]: number }>
  = createSelector(securitySelector, getSecurityIdsByNameSelector);

export const getSecurity: (id: number) => MemoizedSelector<AppState, SecurityRead | null>
  = (id: number): MemoizedSelector<AppState, SecurityRead | null> =>
  createSelector(securitySelector, (state: SecurityState): SecurityRead | null => getSecurityByIdSelector(state, id));

export const getHistoricalSecurityPriceDataSources: MemoizedSelector<AppState, DataSourceWithId[]>
  = createSelector(securitySelector, getHistoricalSecurityPriceDataSourcesSelector);

export const getHistoricalSecurityPriceDataSource: (id: number) => MemoizedSelector<AppState, DataSourceWithId | null>
  = (id: number): MemoizedSelector<AppState, DataSourceWithId | null> =>
  createSelector(securitySelector, (state: SecurityState): DataSourceWithId | null => getHistoricalSecurityPriceDataSourceSelector(state, id));

export const getHistoricalSecurityPriceConfigs: MemoizedSelector<AppState, HistoricalSecurityPriceConfigs>
  = createSelector(securitySelector, getHistoricalSecurityPriceConfigsSelector);

export const getHistoricalSecurityPriceConfig: (securityId: number) => MemoizedSelector<AppState, HistoricalSecurityPriceConfigRead | null>
  = (securityId: number): MemoizedSelector<AppState, HistoricalSecurityPriceConfigRead | null> =>
  createSelector(securitySelector, (state: SecurityState) => getHistoricalSecurityPriceConfigSelector(state, securityId));
