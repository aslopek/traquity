import { Page } from '../../app/page.type';

export const appConfigPrefix = 'app-config';

export const AppCurrencyLocale = {
  key: `${appConfigPrefix}.locales.currency`,
  default: 'en-US'
} as const;

export const AppDateFormat = {
  key: `${appConfigPrefix}.date-format`,
  default: 'yyyy/MM/dd'
};

export const AppDateLocale = {
  key: `${appConfigPrefix}.locales.date`,
  default: 'en-US'
} as const;

export const AppDecimalLocale = {
  key: `${appConfigPrefix}.locales.decimal`,
  default: 'en-US'
} as const;

export const AppPercentLocale = {
  key: `${appConfigPrefix}.locales.percent`,
  default: 'en-US'
} as const;

export const AppHideAbsoluteValues = {
  key: `${appConfigPrefix}.hide-absolute-values`,
  default: false
} as const;

export const AppOpenPage = {
  key: `${appConfigPrefix}.open-page`,
  default: 'settings' satisfies Page as Page
} as const;

export const AppSideMenuOpen = {
  key: `${appConfigPrefix}.side-menu-open`,
  default: true
} as const;
