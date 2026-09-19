import {Component, inject, OnDestroy, Signal} from "@angular/core";
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from "../store/depot-performance.store";
import {RebasedDepotValue} from "../store/computed/rebased-depot-value.type";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {selectedDepotCurrency} from "../../../store/depot/depot.selector";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";
import {ECharts} from "echarts/core";
import {NgxEchartsDirective} from "ngx-echarts";
import {DepotPerformanceChartPipe} from "./depot-performance-chart.pipe";
import {TqCurrencyPipe, TqDatePipe, TqPercentPipe} from "../../../common";
import {MatSlideToggle} from "@angular/material/slide-toggle";
import {BenchmarkResult} from "../store/benchmark/benchmark.type";

@Component({
  selector: "app-depot-performance-chart",
  imports: [
    NgxEchartsDirective,
    DepotPerformanceChartPipe,
    MatSlideToggle
  ],
  providers: [
    TqCurrencyPipe,
    TqDatePipe,
    TqPercentPipe
  ],
  templateUrl: "./depot-performance-chart.component.html",
  styleUrl: "./depot-performance-chart.component.scss",
})
export class DepotPerformanceChartComponent implements OnDestroy {

  private readonly depotPerformanceStore: ReadableDepotPerformanceStore = inject(DepotPerformanceStore);
  protected readonly addCashToAbsoluteValue: Signal<boolean> = this.depotPerformanceStore.addCashToAbsoluteValue;
  protected readonly benchmark: Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null> = this.depotPerformanceStore.benchmarkResult;
  protected readonly currency: Signal<string>;
  protected readonly depotValues: Signal<RebasedDepotValue[]> = this.depotPerformanceStore.depotValues;
  protected readonly filteredDepotValues: Signal<boolean> = this.depotPerformanceStore.filteredDepotValues;
  protected readonly hideAbsoluteValues: Signal<boolean>;
  protected readonly showInvestedCapital: Signal<boolean> = this.depotPerformanceStore.showInvestedCapital;

  private chartInstance: ECharts | null = null;

  constructor(store: Store<AppState>) {
    this.currency = store.selectSignal(selectedDepotCurrency);
    this.hideAbsoluteValues = store.selectSignal(hideAbsoluteValues);
  }

  ngOnDestroy(): void {
    this.chartInstance?.dispose();
  }

  protected onChartInit(e: ECharts): void {
    this.chartInstance = e;
  }

  protected setAddCashToAbsoluteValue(addCashToAbsoluteValue: boolean): void {
    this.depotPerformanceStore.setAddCashToAbsoluteValue(addCashToAbsoluteValue);
  }

  protected setShowInvestedCapital(showInvestedCapital: boolean): void {
    this.depotPerformanceStore.setShowInvestedCapital(showInvestedCapital);
  }
}
