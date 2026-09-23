import {inject, Pipe, PipeTransform} from "@angular/core";
import {AggregatedDividends} from "../store/computed/get-aggregated-dividends";
import type {BarSeriesOption} from 'echarts';
import {EChartsOption} from "echarts";
import {chartToken} from "../../../common/chart/chart-token";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";

@Pipe({
  name: "dividendBarChart",
})
export class DividendBarChartPipe implements PipeTransform {

  private readonly tqCurrencyPipe: TqCurrencyPipe = inject(TqCurrencyPipe);
  private readonly seriesColors: string[] = [
    chartToken("--tq-series-1"),
    chartToken("--tq-series-2"),
    chartToken("--tq-series-3"),
    chartToken("--tq-series-4"),
    chartToken("--tq-series-5"),
    chartToken("--tq-series-6")
  ];
  private readonly surfaceColor: string = chartToken("--tq-surface-raised");
  private readonly borderColor: string = chartToken("--tq-border");
  private readonly textColor: string = chartToken("--tq-text");
  private readonly mutedTextColor: string = chartToken("--tq-text-muted");
  private readonly tooltipColor: string = chartToken("--tq-glass-bg");
  private readonly tooltipCss: string = `box-shadow: ${chartToken("--tq-shadow-2")};`
    + ` border-radius: ${chartToken("--tq-radius-md")}; backdrop-filter: ${chartToken("--tq-glass-blur")};`;

  transform(dividends: AggregatedDividends, hideAbsoluteValues: boolean, currency: string): EChartsOption {
    const seriesLabels: string[] = dividends.years.map((year: number) => `${year}`);
    const seriesData: number[][] = dividends.slices.map((slice): number[] => {
      return slice.aggregated
    });

    const labelOption: BarSeriesOption['label'] = {
      show: true,
      position: 'insideBottom',
      distance: 15,
      align: 'left',
      verticalAlign: 'middle',
      rotate: 90,
      formatter: (params: any) => {
        if (hideAbsoluteValues || params.value === 0) {
          return '';
        } else {
          return `{absolute| ${this.tqCurrencyPipe.transform(params.value, currency)} }`;
        }
      },
      rich: {
        absolute: {
          color: this.textColor,
          backgroundColor: this.surfaceColor,
          borderRadius: 4,
          align: 'center',
          fontWeight: 'bold',
          fontSize: 12
        }
      }
    };

    let series: BarSeriesOption[];
    if (dividends.timespan === 'year') {
      series = [
        {
          name: 'Dividends',
          type: 'bar',
          label: labelOption,
          emphasis: {focus: 'series'},
          data: dividends.slices.map(s => s.aggregated[0]),
          itemStyle: {
            color: this.seriesColors[0],
            borderRadius: [4, 4, 0, 0]
          }
        }
      ];
    } else {
      series = seriesData.map((data, i) => ({
        name: seriesLabels[i],
        type: 'bar',
        label: labelOption,
        emphasis: {focus: 'series'},
        itemStyle: {
          color: this.seriesColors[i % this.seriesColors.length],
          borderRadius: [4, 4, 0, 0]
        },
        data
      }));
    }

    return {
      backgroundColor: 'transparent',
      legend: {
        show: dividends.timespan !== 'year',
        textStyle: {color: this.mutedTextColor},
        inactiveColor: this.borderColor,
        itemWidth: 12,
        itemHeight: 12,
        borderRadius: 4
      },
      tooltip: {
        show: dividends.timespan !== 'year',
        valueFormatter: (value) => {
          if (hideAbsoluteValues) {
            return '';
          } else {
            return this.tqCurrencyPipe.transform(value as number, currency);
          }
        },
        trigger: 'axis',
        backgroundColor: this.tooltipColor,
        borderColor: this.borderColor,
        borderWidth: 1,
        textStyle: {color: this.textColor, fontSize: 13},
        padding: [10, 14],
        extraCssText: this.tooltipCss,
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: this.getXAxisLabels(dividends),
        axisTick: {
          show: false
        },
        axisLine: {lineStyle: {color: this.borderColor}},
        axisLabel: {color: this.mutedTextColor, fontSize: 11}
      },
      yAxis: {
        type: 'value',
        axisLine: {show: false},
        axisTick: {show: false},
        splitLine: {lineStyle: {color: this.borderColor}},
        axisLabel: {
          show: !hideAbsoluteValues,
          color: this.mutedTextColor,
          fontSize: 11,
          formatter: value => this.tqCurrencyPipe.transform(value, currency, '1.0-0')
        }
      },
      series: series
    };
  }

  private getXAxisLabels(dividends: AggregatedDividends): string[] {
    if (dividends.timespan === 'month') {
      return [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];
    } else if (dividends.timespan === 'quarter') {
      return ['Q1', 'Q2', 'Q3', 'Q4'];
    } else {
      return dividends.years.map(year => `${year}`);
    }
  }
}
