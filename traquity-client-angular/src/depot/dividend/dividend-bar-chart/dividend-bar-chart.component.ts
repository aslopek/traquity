import {Component, Inject, OnDestroy, Signal,} from "@angular/core";
import {NgxEchartsDirective} from "ngx-echarts";
import {AggregatedDividends} from "../store/computed/get-aggregated-dividends";
import {DividendBarChartPipe} from "./dividend-bar-chart.pipe";
import {ECharts} from "echarts/core";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {selectedDepotCurrency} from "../../../store/depot/depot.selector";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";
import {dividendStore, ReadableDividendStore} from "../store/dividend.store";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";

@Component({
  selector: "app-dividend-bar-chart",
  imports: [NgxEchartsDirective, DividendBarChartPipe],
  providers: [TqCurrencyPipe],
  templateUrl: "./dividend-bar-chart.component.html",
  styleUrl: "./dividend-bar-chart.component.scss",
})
export class DividendBarChartComponent implements OnDestroy {
  protected readonly aggregatedDividends: Signal<AggregatedDividends>;
  protected readonly hideAbsoluteValues: Signal<boolean>;
  protected readonly currency: Signal<string>;
  private chartInstance: ECharts | null = null;

  constructor(
    globalStore: Store<AppState>,
    @Inject(dividendStore) signalStore: ReadableDividendStore,
  ) {
    this.aggregatedDividends = signalStore.aggregatedDividends;
    this.hideAbsoluteValues = globalStore.selectSignal(hideAbsoluteValues);
    this.currency = globalStore.selectSignal(selectedDepotCurrency);
  }

  ngOnDestroy(): void {
    this.chartInstance?.dispose();
  }

  protected onChartInit(e: ECharts): void {
    this.chartInstance = e;
  }
}
