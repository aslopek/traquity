import { Page } from '../../app/page.type';

export type LocaleConfig = {
  currency: string
  date: string
  decimal: string
  percent: string
}

export type AppConfigState = {
  dateFormat: string
  devModeActive: boolean
  hideAbsoluteValues: boolean
  loaded: boolean
  openPage: Page
  sideMenuOpen: boolean
  locales: LocaleConfig
}
