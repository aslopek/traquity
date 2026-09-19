import {AsyncPipe} from "@angular/common";
import {Component, inject} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatSlideToggle} from "@angular/material/slide-toggle";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatOption, MatSelect, MatSelectChange,} from "@angular/material/select";
import {Store} from "@ngrx/store";
import {Observable, take} from "rxjs";
import {AppCurrencyLocale, AppDateFormat, AppDecimalLocale,} from "../../store/app-config/app-config-keys";
import {AppConfigActions} from "../../store/app-config/app-config.actions";
import {getCurrencyLocale, getDateFormat, getDecimalLocale, hideAbsoluteValues, isDevModeActive,} from "../../store/app-config/app-config.selector";
import {AppState} from "../../store/app.state";

@Component({
  selector: "app-appearance",
  imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatSlideToggle,
    FormsModule,
    AsyncPipe,
  ],
  templateUrl: "./appearance.component.html",
  styleUrl: "./appearance.component.scss",
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
