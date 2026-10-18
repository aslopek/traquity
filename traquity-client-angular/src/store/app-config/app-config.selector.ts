import {
  createFeatureSelector,
  createSelector,
  MemoizedSelector
} from '@ngrx/store';
import {Page} from '../../app/page.type';
import {AppConfigState} from './app-config.state';
import {
  appConfigSlice,
  AppState
} from '../app.state';

const appConfigSelector: MemoizedSelector<AppState, AppConfigState>
  = createFeatureSelector<AppConfigState>(appConfigSlice);

export const getCurrencyLocale: MemoizedSelector<AppState, string>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.locales.currency);

export const getDateFormat: MemoizedSelector<AppState, string>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.dateFormat);

export const getDateLocale: MemoizedSelector<AppState, string>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.locales.date);

export const getDecimalLocale: MemoizedSelector<AppState, string>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.locales.decimal);

export const getOpenPage: MemoizedSelector<AppState, Page>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.openPage);

export const getPercentLocale: MemoizedSelector<AppState, string>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.locales.percent);

export const hideAbsoluteValues: MemoizedSelector<AppState, boolean>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.hideAbsoluteValues);

export const isAppConfigLoaded: MemoizedSelector<AppState, boolean>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.loaded);

export const isDevModeActive: MemoizedSelector<AppState, boolean>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.devModeActive);

export const isSideMenuOpen: MemoizedSelector<AppState, boolean>
  = createSelector(appConfigSelector,
  (state: AppConfigState) => state.sideMenuOpen);
