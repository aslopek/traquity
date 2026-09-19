import {Component, Input, numberAttribute, OnDestroy, OnInit, signal, WritableSignal,} from "@angular/core";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatIcon} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {format} from "date-fns";
import {ECharts} from "echarts/core";
import {NgxEchartsDirective} from "ngx-echarts";
import {firstValueFrom} from "rxjs";
import {DataRange, fromDateRange, TqCurrencyPipe, TqDatePipe, TqPercentPipe} from "../../../common";
import {CurrencySelectComponent} from "../../../common/components/currency-select/currency-select.component";
import {ConfigApi} from "../../../gen/api/configuration";
import {HistoricalSecurityPrice, HistoricalSecurityPriceApi,} from "../../../gen/api/historical-security-price";
import {HistoricalPriceChartPipe} from "./historical-price-chart.pipe";

@Component({
  selector: "app-historical-price",
  imports: [
    NgxEchartsDirective,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatSlideToggleModule,
    MatIcon,
    MatProgressBarModule,
    CurrencySelectComponent,
    HistoricalPriceChartPipe,
  ],
  providers: [
    TqCurrencyPipe,
    TqDatePipe,
    TqPercentPipe,
  ],
  templateUrl: "historical-price-chart.component.html",
  styleUrls: ["historical-price-chart.component.scss"],
})
export class HistoricalPriceChartComponent implements OnDestroy, OnInit {
  protected currencies: string[] = [];

  selectedSecurityId: number = 0;
  selectedCurrency: string | undefined;

  protected chartInstance: ECharts | null = null;
  protected readonly isLoading: WritableSignal<boolean> = signal(false);
  protected readonly dataAvailable: WritableSignal<boolean> = signal(true);
  protected readonly dataRange: WritableSignal<DataRange> = signal("1y");
  protected readonly percent: WritableSignal<boolean> = signal(false);
  protected readonly prices: WritableSignal<HistoricalSecurityPrice[]> = signal([]);

  constructor(
    private readonly historicalSecurityPriceApi: HistoricalSecurityPriceApi,
    private readonly configApi: ConfigApi,
  ) {
  }

  @Input({
    transform: numberAttribute,
    required: true,
  })
  set securityId(securityId: number) {
    this.selectedSecurityId = securityId;
    this.loadPrices();
  }

  async ngOnInit(): Promise<void> {
    this.currencies = await firstValueFrom(
      this.configApi.getSupportedCurrencies(),
    );
  }

  ngOnDestroy(): void {
    this.chartInstance?.dispose();
  }

  onChartInit(e: ECharts): void {
    this.chartInstance = e;
  }

  async changeDataRange(newRange: DataRange): Promise<void> {
    this.dataRange.set(newRange);
    await this.loadPrices();
  }

  usePercent(percent: boolean): void {
    this.percent.set(percent);
  }

  async changeCurrency(currency: string | undefined): Promise<void> {
    this.selectedCurrency = currency;
    await this.loadPrices();
  }

  private async loadPrices(): Promise<void> {
    this.isLoading.set(true);
    const startDate: string = format(fromDateRange(this.dataRange()), "yyyy-MM-dd");

    let prices: HistoricalSecurityPrice[];

    try {
      prices = await firstValueFrom(
        this.historicalSecurityPriceApi.getHistoricalSecurityPrices(
          this.selectedSecurityId,
          startDate,
          this.selectedCurrency,
        ),
      );
    } catch (e) {
      this.isLoading.set(false);
      return;
    }

    this.dataAvailable.set(prices.length > 0);
    this.prices.set(prices);
    this.isLoading.set(false);
  }
}
