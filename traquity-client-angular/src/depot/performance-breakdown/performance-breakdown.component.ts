import {Component, computed, inject, input, InputSignal, Signal} from "@angular/core";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {Store} from "@ngrx/store";
import {AppState} from "../../store/app.state";
import {hideAbsoluteValues} from "../../store/app-config/app-config.selector";
import {PerformanceLabelComponent} from "../../common/components/performance-label/performance-label.component";
import {ObfuscatedValueComponent} from "../../common/components/obfuscated-value/obfuscated-value.component";
import {TqCurrencyPipe} from "../../common/pipe/tq-currency.pipe";
import {CostBasisBreakdownPipe} from "./cost-basis-breakdown.pipe";
import {LoadPerformanceBreakdownArgs} from "./store/effects/load-performance-breakdown";
import {PerformanceBreakdownStore, ReadablePerformanceBreakdownStore} from "./store/performance-breakdown.store";

@Component({
  selector: "app-performance-breakdown",
  imports: [MatIconModule, MatTooltipModule, TqCurrencyPipe, PerformanceLabelComponent, ObfuscatedValueComponent, CostBasisBreakdownPipe],
  providers: [PerformanceBreakdownStore, TqCurrencyPipe],
  templateUrl: "./performance-breakdown.component.html",
  styleUrl: "./performance-breakdown.component.scss",
})
export class PerformanceBreakdownComponent {
  readonly depotIds: InputSignal<number[]> = input.required();
  readonly securityIds: InputSignal<number[] | undefined> = input<number[] | undefined>();

  // one entry per row the loaded breakdown renders, true where that row carries the `--sum` divider, so the
  // skeleton takes the same height as the content it stands in for
  protected readonly skeletonRows: readonly boolean[] = [false, false, false, false, false, true, false, true, false];

  protected readonly performanceBreakdownStore: ReadablePerformanceBreakdownStore = inject(PerformanceBreakdownStore);
  protected readonly hideAbsoluteValues: Signal<boolean> = inject(Store<AppState>).selectSignal(hideAbsoluteValues);

  constructor() {
    this.performanceBreakdownStore.load(computed((): LoadPerformanceBreakdownArgs => ({
      depotIds: this.depotIds(),
      securityIds: this.securityIds()
    })));
  }
}
