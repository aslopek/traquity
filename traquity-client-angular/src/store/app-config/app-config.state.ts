import { Page } from '../../app/page.type';

export type LocaleConfig = {
  currency: string
  date: string
  decimal: string
  percent: string
}

export type AppConfigState = {
  christmasTheme: boolean
  dateFormat: string
  devModeActive: boolean
  hideAbsoluteValues: boolean
  loaded: boolean
  openPage: Page
  sideMenuOpen: boolean
  locales: LocaleConfig
}
