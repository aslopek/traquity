import {AsyncPipe} from '@angular/common';
import {Component, computed, inject, Signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIcon} from '@angular/material/icon';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatTooltip} from '@angular/material/tooltip';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatOption, MatSelect, MatSelectChange,} from '@angular/material/select';
import {Store} from '@ngrx/store';
import {Observable, take} from 'rxjs';
import {isChristmasThemeOffered} from '../../common/functions/is-christmas-theme-offered';
import {AppCurrencyLocale, AppDateFormat, AppDecimalLocale,} from '../../store/app-config/app-config-keys';
import {AppConfigActions} from '../../store/app-config/app-config.actions';
import {
  getCurrencyLocale,
  getDateFormat,
  getDecimalLocale,
  hideAbsoluteValues,
  isChristmasThemeOn,
  isDevModeActive,
} from '../../store/app-config/app-config.selector';
import {AppState} from '../../store/app.state';

@Component({
  selector: 'app-appearance',
  imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MatIcon,
    MatTooltip,
    FormsModule,
    AsyncPipe,
  ],
  templateUrl: './appearance.component.html',
  styleUrl: './appearance.component.scss',
})
export class AppearanceComponent {
  private readonly store: Store<AppState> = inject(Store);

  protected readonly AppCurrencyLocale = AppCurrencyLocale;
  protected readonly currencyLocale$: Observable<string> =
    this.store.select(getCurrencyLocale);

  protected readonly AppDateFormat = AppDateFormat;
  protected readonly dateFormat$: Observable<string> =
    this.store.select(getDateFormat);

  protected readonly AppDecimalLocale = AppDecimalLocale;
  protected readonly decimalFormat$: Observable<string> =
    this.store.select(getDecimalLocale);

  protected readonly hideAbsoluteValues$: Observable<boolean> =
    this.store.select(hideAbsoluteValues);

  protected readonly devModeActive$: Observable<boolean> =
    this.store.select(isDevModeActive);

  private readonly devModeActive: Signal<boolean> = this.store.selectSignal(isDevModeActive);

  protected readonly christmasThemeOffered: Signal<boolean> = computed(
    (): boolean => isChristmasThemeOffered(new Date(), this.devModeActive()),
  );

  protected readonly christmasTheme$: Observable<boolean> =
    this.store.select(isChristmasThemeOn);

  protected setDateFormat(change: MatSelectChange): void {
    this.store.dispatch(
      AppConfigActions.setDateFormat({dateFormat: change.value}),
    );
  }

  protected setCurrencyLocale(change: MatSelectChange): void {
    this.store.dispatch(
      AppConfigActions.setCurrencyLocale({currencyLocale: change.value}),
    );
  }

  protected setOtherNumericLocales(change: MatSelectChange): void {
    const locale: string = change.value;
    this.store.dispatch(
      AppConfigActions.setDecimalLocale({decimalLocale: locale}),
    );
    this.store.dispatch(
      AppConfigActions.setPercentLocale({percentLocale: locale}),
    );
  }

  protected toggleHideAbsoluteValues(): void {
    this.hideAbsoluteValues$.pipe(take(1)).subscribe((hideAbsoluteValues) => {
      this.store.dispatch(
        AppConfigActions.setHideAbsoluteValues({
          hideAbsoluteValues: !hideAbsoluteValues,
        }),
      );
    });
  }

  protected toggleChristmasTheme(): void {
    this.christmasTheme$.pipe(take(1)).subscribe((christmasTheme: boolean): void => {
      this.store.dispatch(
        AppConfigActions.setChristmasTheme({
          christmasTheme: !christmasTheme,
        }),
      );
    });
  }

  protected toggleDevMode(): void {
    this.devModeActive$.pipe(take(1)).subscribe((isActive) => {
      this.store.dispatch(
        AppConfigActions.setDevModeActive({
          devModeActive: !isActive,
          persist: true,
        }),
      );
    });
  }
}
