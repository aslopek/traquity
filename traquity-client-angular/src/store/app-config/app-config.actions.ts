import {
  createActionGroup,
  props
} from '@ngrx/store';
import {Page} from '../../app/page.type';
import {AppConfigState} from './app-config.state';

export const AppConfigActions = createActionGroup({
  source: 'App',
  events: {
    'Set App Config': props<Omit<AppConfigState, 'devModeActive' | 'loaded'>>(),

    'Set Currency Locale': props<{ currencyLocale: string }>(),
    'Set Currency Locale Done': props<{ currencyLocale: string }>(),

    'Set Date Format': props<{ dateFormat: string }>(),
    'Set Date Format Done': props<{ dateFormat: string }>(),

    'Set Date Locale': props<{ dateLocale: string }>(),
    'Set Date Locale Done': props<{ dateLocale: string }>(),

    'Set Decimal Locale': props<{ decimalLocale: string }>(),
    'Set Decimal Locale Done': props<{ decimalLocale: string }>(),

    'Set Hide Absolute Values': props<{ hideAbsoluteValues: boolean }>(),
    'Set Hide Absolute Values Done': props<{ hideAbsoluteValues: boolean }>(),

    'Set Open Page': props<{ openPage: Page }>(),
    'Set Open Page Done': props<{ openPage: Page }>(),

    'Set Percent Locale': props<{ percentLocale: string }>(),
    'Set Percent Locale Done': props<{ percentLocale: string }>(),

    'Set Dev Mode Active': props<{
      devModeActive: boolean
      persist: boolean
    }>(),
    'Set Dev Mode Active Done': props<{ devModeActive: boolean }>(),

    'Set Side Menu Open': props<{ sideMenuOpen: boolean }>(),
    'Set Side Menu Open Done': props<{ sideMenuOpen: boolean }>(),
  }
});
