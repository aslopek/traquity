import {inject, Pipe, PipeTransform} from "@angular/core";
import {EChartsOption} from "echarts";
import {RebasedDepotValue} from "../store/computed/rebased-depot-value.type";
import {chartToken, chartTokenAlpha} from "../../../common/chart/chart-token";
import {escapeHtml} from "../../../common/chart/escape-html";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqDatePipe} from "../../../common/pipe/tq-date.pipe";
import {TqPercentPipe} from "../../../common/pipe/tq-percent.pipe";
import {BenchmarkResult} from "../store/benchmark/benchmark.type";

@Pipe({
  name: "depotPerformanceChart",
})
export class DepotPerformanceChartPipe implements PipeTransform {

  private readonly tqCurrencyPipe: TqCurrencyPipe = inject(TqCurrencyPipe);
  private readonly tqDatePipe: TqDatePipe = inject(TqDatePipe);
  private readonly tqPercentPipe: TqPercentPipe = inject(TqPercentPipe);
  private readonly seriesColor: string = chartToken("--tq-series-1");
  private readonly seriesFillTop: string = chartTokenAlpha("--tq-series-1", 0.18);
  private readonly seriesFillBottom: string = chartTokenAlpha("--tq-series-1", 0);
  private readonly benchmarkColors: readonly string[] = [chartToken("--tq-series-2"), chartToken("--tq-series-5")];
  private readonly borderColor: string = chartToken("--tq-border");
  private readonly axisLabelColor: string = chartToken("--tq-text-faint");
  private readonly guideLineColor: string = chartToken("--tq-border-strong");
  private readonly tooltipColor: string = chartToken("--tq-glass-bg");
  private readonly tooltipCss: string = `box-shadow: ${chartToken("--tq-shadow-2")};`
    + ` border-radius: ${chartToken("--tq-radius-md")}; backdrop-filter: ${chartToken("--tq-glass-blur")};`;
  private readonly textColor: string = chartToken("--tq-text");
  private readonly mutedTextColor: string = chartToken("--tq-text-muted");
  private readonly positiveColor: string = chartToken("--tq-positive-soft");
  private readonly negativeColor: string = chartToken("--tq-negative-soft");

  transform(
    positions: RebasedDepotValue[],
    hideAbsoluteValues: boolean,
    currency: string,
    showCapitalInvested: boolean,
    showHorizontalIndicator: boolean,
    benchmark: BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null
  ): EChartsOption {
    if (!positions || positions.length === 0) {
      return {};
    }

    const dates: string[] = [];
    const absoluteValues: number[] = [];
    const investedCapital: number[] = [];
    const performanceAbsolute: { [date: string]: number } = {};
    const performanceRelative: { [date: string]: number | 'infinity' } = {};
    let capitalInvested: boolean = false;
    let formattedDate: string;

    for (const item of positions) {
      formattedDate = this.formatDate(item.date);
      dates.push(formattedDate);
      absoluteValues.push(item.absoluteValue);
      investedCapital.push(item.investedCapital);
      performanceAbsolute[formattedDate] = item.performanceAbsolute;
      performanceRelative[formattedDate] = item.performanceRelative;
      if (item.investedCapital > 0) {
        capitalInvested = true;
      }
    }

    const series: NonNullable<EChartsOption['series']> = [
      {
        name: 'Depot Value',
        type: 'line',
        data: absoluteValues,
        showSymbol: false,
        smooth: 0.2,
        lineStyle: {width: 2, color: this.seriesColor},
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              {offset: 0, color: this.seriesFillTop},
              {offset: 1, color: this.seriesFillBottom}
            ]
          }
        }
      }
    ];

    const displayCapitalInvestedSeries: boolean = showCapitalInvested && capitalInvested;
    if (displayCapitalInvestedSeries) {
      series.push({
        name: 'Invested',
        type: 'line',
        data: investedCapital,
        showSymbol: false,
        smooth: 0.2,
        lineStyle: {
          width: 1.5,
          type: 'dashed',
          color: this.guideLineColor
        }
      });
    }

    if (showHorizontalIndicator) {
      const startValue: number = absoluteValues[0] ?? 0;
      const horizontalLineData: number[] = new Array(absoluteValues.length).fill(startValue);
      series.push({
        name: 'Start Value Indicator',
        type: 'line',
        data: horizontalLineData,
        showSymbol: false,
        silent: true,
        lineStyle: {
          width: 1,
          type: 'dashed',
          color: this.guideLineColor
        }
      });
    }

    if (benchmark) {
      const benchmarkList: BenchmarkResult[] = Array.isArray(benchmark) ? benchmark : [benchmark];

      benchmarkList.forEach((bench: BenchmarkResult, index: number): void => {
        series.push({
          name: bench.name,
          type: 'line',
          data: bench.values,
          showSymbol: false,
          smooth: 0.2,
          lineStyle: {
            width: 2,
            type: 'solid',
            color: this.benchmarkColors[index % this.benchmarkColors.length]
          }
        });
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: this.tooltipColor,
        borderColor: this.borderColor,
        borderWidth: 1,
        textStyle: {
          color: this.textColor,
          fontSize: 13
        },
        padding: [10, 14],
        extraCssText: this.tooltipCss,
        // echarts takes this as an HTML string, so nothing escapes it for us. seriesName and date are controlled today
        // (fixed labels, formatted dates), but go through escapeHtml anyway so a later user-named benchmark is safe.
        formatter: (params: unknown): string => {
          if (!Array.isArray(params) || params.length === 0) return '';

          const date: string = params[0].name;
          const rawProfit: number = performanceAbsolute[date] ?? 0;
          const profitColor: string = rawProfit >= 0 ? this.positiveColor : this.negativeColor;

          let seriesHtml: string = '';

          params.forEach((p: { seriesName: string, value?: number }): void => {
            const seriesName: string = p.seriesName;
            const rawValue: number = p.value ?? 0;

            if (seriesName === 'Start Value Indicator') {
              return;
            }

            const formattedValue: string = hideAbsoluteValues ? '••••••' : this.formatCurrency(rawValue, currency);

            seriesHtml += `
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
                <span style="color: ${this.mutedTextColor};">${escapeHtml(seriesName)}:</span>
                <strong style="font-variant-numeric: tabular-nums; color: ${this.textColor};">${formattedValue}</strong>
              </div>
            `;
          });

          const formattedPerformanceAbsolute: string = hideAbsoluteValues
            ? '••••••'
            : `${rawProfit >= 0 ? '+' : ''}${this.formatCurrency(rawProfit, currency)}`;
          const formattedPerformanceRelative: string = `${rawProfit >= 0 ? '+' : ''}${this.formatPercent(performanceRelative[date])}`;
          return `
            <div style="font-weight: 500; margin-bottom: 6px; font-size: 11px;
                        color: ${this.axisLabelColor};">${escapeHtml(date)}</div>
            
            ${seriesHtml}
            
            <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 6px;
                        border-top: 1px dashed ${this.borderColor}; padding-top: 4px;">
              <span style="color: ${this.mutedTextColor};">${rawProfit >= 0 ? 'Growth' : 'Decline'}:</span>
              <strong style="color: ${profitColor}; font-variant-numeric: tabular-nums;">${formattedPerformanceAbsolute}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 24px;">
              <span></span>
              <strong style="color: ${profitColor}; font-variant-numeric: tabular-nums;">${formattedPerformanceRelative}</strong>
            </div>
          `;
        }
      },

      grid: {
        left: '1%',
        right: '1%',
        bottom: '1%',
        top: '4%',
        containLabel: true
      },

      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: {lineStyle: {color: this.borderColor}},
        axisTick: {show: false},
        axisLabel: {
          color: this.axisLabelColor,
          fontSize: 11,
          margin: 12
        }
      },

      yAxis: {
        type: 'value',
        scale: true,
        axisLine: {show: false},
        axisTick: {show: false},
        splitLine: {lineStyle: {color: this.borderColor}},
        axisLabel: {
          color: this.axisLabelColor,
          fontSize: 11,
          formatter: (value: number): string => hideAbsoluteValues ? '••••' : this.formatCurrency(value, currency)
        }
      },
      series
    };
  }

  private formatCurrency(value: number, currency: string): string {
    return this.tqCurrencyPipe.transform(value, currency);
  }

  private formatDate(date: string): string {
    return this.tqDatePipe.transform(date);
  }

  private formatPercent(value: number | 'infinity'): string {
    return value === 'infinity' ? '∞' : this.tqPercentPipe.transform(value);
  }
}
