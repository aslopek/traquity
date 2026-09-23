import {Component, DestroyRef, inject, input, InputSignal, Signal,} from "@angular/core";
import {lotStore, ReadableLotStore} from "./store/lot.store";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {combineLatest, Observable} from "rxjs";
import {takeUntilDestroyed, toObservable} from "@angular/core/rxjs-interop";
import {PerformanceLabelComponent} from "../../../common/components/performance-label/performance-label.component";
import {SecurityNamePipe} from "../../../common/pipe/security-name.pipe";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqDatePipe} from "../../../common/pipe/tq-date.pipe";
import {TqDecimalPipe} from "../../../common/pipe/tq-decimal.pipe";
import {TqPercentPipe} from "../../../common/pipe/tq-percent.pipe";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";

@Component({
  selector: "app-lot-view",
  imports: [
    TqDatePipe,
    PerformanceLabelComponent,
    TqDecimalPipe,
    TqCurrencyPipe,
    SecurityNamePipe,
    TqPercentPipe,
  ],
  providers: [lotStore],
  templateUrl: "./lot-view.component.html",
  styleUrl: "./lot-view.component.scss",
})
export class LotViewComponent {
  readonly depotIds: InputSignal<number[]> = input.required();
  readonly securityIds: InputSignal<number[]> = input.required();

  protected readonly store: Store<AppState> = inject(Store);
  protected readonly lotStore: ReadableLotStore = inject(lotStore);

  protected hideAbsoluteValues: Signal<boolean> =
    this.store.selectSignal(hideAbsoluteValues);

  constructor(destroyRef: DestroyRef) {
    const depotIds$: Observable<number[]> = toObservable(this.depotIds);
    const securityIds$: Observable<number[]> = toObservable(this.securityIds);

    combineLatest([depotIds$, securityIds$])
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(async (values: [number[], number[]]): Promise<void> => {
        const [depotIds, securityIds] = values;
        await this.lotStore.setDepotsAndSecurities(depotIds, securityIds);
      });
  }
}
