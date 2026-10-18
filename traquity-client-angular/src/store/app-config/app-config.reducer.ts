import { createReducer, on } from '@ngrx/store';
import {
  AppCurrencyLocale,
  AppDateFormat,
  AppDateLocale,
  AppDecimalLocale,
  AppHideAbsoluteValues,
  AppOpenPage,
  AppPercentLocale,
  AppSideMenuOpen
} from './app-config-keys';
import { AppConfigActions } from './app-config.actions';
import { AppConfigState } from './app-config.state';

export const initialState: AppConfigState = {
  dateFormat: AppDateFormat.default,
  devModeActive: false,
  hideAbsoluteValues: AppHideAbsoluteValues.default,
  loaded: false,
  openPage: AppOpenPage.default,
  sideMenuOpen: AppSideMenuOpen.default,
  locales: {
    currency: AppCurrencyLocale.default,
    date: AppDateLocale.default,
    decimal: AppDecimalLocale.default,
    percent: AppPercentLocale.default
  }
};

export const appConfigReducer = createReducer(
  initialState,

  on(AppConfigActions.setAppConfig, (state, clientConfig) => {
    return {
      ...state,
      ...clientConfig,
      loaded: true
    };
  }),

  on(AppConfigActions.setCurrencyLocaleDone, (state, { currencyLocale }) => {
    return {
      ...state,
      locales: {
        ...state.locales,
        currency: currencyLocale
      }
    };
  }),

  on(AppConfigActions.setDateFormatDone, (state, { dateFormat }) => {
    return {
      ...state,
      dateFormat
    };
  }),

  on(AppConfigActions.setDateLocaleDone, (state, { dateLocale }) => {
    return {
      ...state,
      locales: {
        ...state.locales,
        date: dateLocale
      }
    };
  }),

  on(AppConfigActions.setDecimalLocaleDone, (state, { decimalLocale }) => {
    return {
      ...state,
      locales: {
        ...state.locales,
        decimal: decimalLocale
      }
    };
  }),

  on(AppConfigActions.setHideAbsoluteValuesDone, (state, { hideAbsoluteValues }) => {
    return {
      ...state,
      hideAbsoluteValues
    };
  }),

  on(AppConfigActions.setOpenPageDone, (state, { openPage }) => {
    return {
      ...state,
      openPage
    };
  }),

  on(AppConfigActions.setPercentLocaleDone, (state, { percentLocale }) => {
    return {
      ...state,
      locales: {
        ...state.locales,
        percent: percentLocale
      }
    };
  }),

  on(AppConfigActions.setDevModeActiveDone, (state, { devModeActive }) => {
    return {
      ...state,
      devModeActive: devModeActive
    };
  }),

  on(AppConfigActions.setSideMenuOpenDone, (state, { sideMenuOpen }) => {
    return {
      ...state,
      sideMenuOpen: sideMenuOpen
    };
  }),
);
