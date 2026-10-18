import {createReducer, on} from '@ngrx/store';
import {overwriteSecurity} from './reducers/overwrite-security.reducer';
import {SecurityActions} from './security.actions';
import {SecurityState} from './security.state';
import {overwriteHistoricalSecurityPriceConfig} from './reducers/overwrite-historical-security-price-config.reducer';
import {overwriteSecurities} from './reducers/overwrite-securities.reducer';
import {overwriteHistoricalSecurityPriceDataSources} from './reducers/overwrite-historical-security-price-data-sources.reducer';
import {setHistoricalSecurityPriceDataSource} from './reducers/add-historical-security-price-data-source.reducer';
import {deleteHistoricalSecurityPriceDataSource} from './reducers/delete-historical-security-price-data-source.reducer';

const initialState: SecurityState = {
  securities: {},
  historicalSecurityPriceConfigs: {},
  historicalSecurityPriceDataSources: []
};

export const securityReducer = createReducer(
  initialState,

  on(SecurityActions.setSecurities, (state, actionArgs) => overwriteSecurities(state, actionArgs.securities)),

  on(SecurityActions.loadSecuritySuccess, (state, {security}) => overwriteSecurity(state, security)),

  on(SecurityActions.updateSecuritySuccess, (state, {security}) => overwriteSecurity(state, security)),

  on(SecurityActions.loadHistoricalSecurityPriceConfigDone, (state, args) =>
    overwriteHistoricalSecurityPriceConfig(state, args.securityId, args.historicalSecurityPriceConfig)),

  on(SecurityActions.updateHistoricalSecurityPriceConfigDone, (state, args) =>
    overwriteHistoricalSecurityPriceConfig(state, args.securityId, args.historicalSecurityPriceConfig)),

  on(SecurityActions.loadHistoricalSecurityPriceDataSourcesDone, overwriteHistoricalSecurityPriceDataSources),

  on(SecurityActions.setHistoricalSecurityPriceDataSourceDone, setHistoricalSecurityPriceDataSource),

  on(SecurityActions.deleteHistoricalSecurityPriceDataSourceDone, deleteHistoricalSecurityPriceDataSource)
);
