import {inject, Pipe, PipeTransform} from "@angular/core";
import {EChartsOption} from "echarts";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqDatePipe} from "../../../common/pipe/tq-date.pipe";
import {TqPercentPipe} from "../../../common/pipe/tq-percent.pipe";
import {HistoricalSecurityPrice} from "../../../gen/api/historical-security-price";
import {chartToken, chartTokenAlpha} from "../../../common/chart/chart-token";
import {escapeHtml} from "../../../common/chart/escape-html";

@Pipe({
  name: "historicalPriceChart",
})
export class HistoricalPriceChartPipe implements PipeTransform {

  private readonly tqCurrencyPipe: TqCurrencyPipe = inject(TqCurrencyPipe);
  private readonly tqDatePipe: TqDatePipe = inject(TqDatePipe);
  private readonly tqPercentPipe: TqPercentPipe = inject(TqPercentPipe);
  private readonly borderColor: string = chartToken("--tq-border");
  private readonly axisLabelColor: string = chartToken("--tq-text-faint");
  private readonly tooltipColor: string = chartToken("--tq-glass-bg");
  private readonly tooltipCss: string = `box-shadow: ${chartToken("--tq-shadow-2")};`
    + ` border-radius: ${chartToken("--tq-radius-md")}; backdrop-filter: ${chartToken("--tq-glass-blur")};`;
  private readonly textColor: string = chartToken("--tq-text");
  private readonly mutedTextColor: string = chartToken("--tq-text-muted");
  private readonly positiveColor: string = chartToken("--tq-positive-soft");
  private readonly negativeColor: string = chartToken("--tq-negative-soft");
  private readonly positiveFillTop: string = chartTokenAlpha("--tq-positive", 0.18);
  private readonly positiveFillBottom: string = chartTokenAlpha("--tq-positive", 0);
  private readonly negativeFillTop: string = chartTokenAlpha("--tq-negative", 0.18);
  private readonly negativeFillBottom: string = chartTokenAlpha("--tq-negative", 0);

  transform(prices: HistoricalSecurityPrice[], percent: boolean): EChartsOption {
    if (!prices || prices.length === 0) {
      return {};
    }

    const currency: string = prices[0].currency;
    const basePrice: number = prices[0].price;
    const hasPositiveDirection: boolean = prices[prices.length - 1].price >= basePrice;
    const lineColor: string = hasPositiveDirection ? this.positiveColor : this.negativeColor;
    const areaFillTop: string = hasPositiveDirection ? this.positiveFillTop : this.negativeFillTop;
    const areaFillBottom: string = hasPositiveDirection ? this.positiveFillBottom : this.negativeFillBottom;

    const dates: string[] = [];
    const values: number[] = [];
    const rawPrices: { [date: string]: number } = {};
    const absoluteChange: { [date: string]: number } = {};
    const relativeChange: { [date: string]: number } = {};
    let formattedDate: string;

    for (const item of prices) {
      formattedDate = this.formatDate(item.date);
      dates.push(formattedDate);
      values.push(percent ? (item.price / basePrice - 1) * 100 : item.price);
      rawPrices[formattedDate] = item.price;
      absoluteChange[formattedDate] = item.price - basePrice;
      relativeChange[formattedDate] = item.price / basePrice - 1;
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
        // echarts takes this as an HTML string, so nothing escapes it for us. The date is a formatted value today, but
        // goes through escapeHtml anyway so the configured date format cannot inject markup.
        formatter: (params: unknown): string => {
          if (!Array.isArray(params) || params.length === 0) return '';

          const date: string = (params[0] as { name: string }).name;
          const rawChange: number = absoluteChange[date] ?? 0;
          const changeColor: string = rawChange >= 0 ? this.positiveColor : this.negativeColor;

          const absoluteLabel: string = `${rawChange >= 0 ? '+' : ''}${this.formatCurrency(rawChange, currency)}`;
          const relativeLabel: string = `${rawChange >= 0 ? '+' : ''}${this.formatPercent(relativeChange[date] ?? 0)}`;

          return `
            <div style="font-weight: 500; margin-bottom: 6px; font-size: 11px;
                        color: ${this.axisLabelColor};">${escapeHtml(date)}</div>

            <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
              <span style="color: ${this.mutedTextColor};">Price:</span>
              <strong style="font-variant-numeric: tabular-nums; color: ${this.textColor};">
                ${this.formatCurrency(rawPrices[date] ?? 0, currency)}
              </strong>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 6px;
                        border-top: 1px dashed ${this.borderColor}; padding-top: 4px;">
              <span style="color: ${this.mutedTextColor};">${rawChange >= 0 ? 'Growth' : 'Decline'}:</span>
              <strong style="color: ${changeColor}; font-variant-numeric: tabular-nums;">${absoluteLabel}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 24px;">
              <span></span>
              <strong style="color: ${changeColor}; font-variant-numeric: tabular-nums;">${relativeLabel}</strong>
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
          formatter: (value: number): string => percent ? `${value.toFixed(0)}%` : this.formatCurrency(value, currency)
        }
      },

      series: [
        {
          name: 'Price',
          type: 'line',
          data: values,
          showSymbol: false,
          smooth: 0.2,
          lineStyle: {width: 3, color: lineColor},
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                {offset: 0, color: areaFillTop},
                {offset: 1, color: areaFillBottom}
              ]
            }
          }
        }
      ]
    };
  }

  private formatCurrency(value: number, currency: string): string {
    return this.tqCurrencyPipe.transform(value, currency);
  }

  private formatDate(date: string): string {
    return this.tqDatePipe.transform(date);
  }

  private formatPercent(value: number): string {
    return this.tqPercentPipe.transform(value);
  }
}
