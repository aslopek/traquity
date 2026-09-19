import {Pipe, PipeTransform} from "@angular/core";
import {TqCurrencyPipe, TqDecimalPipe, TqPercentPipe} from "../../../common";
import {DepotPosition} from "../../../gen/api/depot-position";
import {SecurityLogoUrlPipe} from "../../../common/pipe/security-logo-url.pipe";
import {EChartsOption} from "echarts";
import {positionPieChartGeometry} from "./position-pie-chart-geometry";
import {chartToken} from "../../../common/chart/chart-token";

@Pipe({
  name: 'positionPieChart',
  pure: true
})
export class PositionPieChartPipe implements PipeTransform {

  private readonly surfaceColor: string = chartToken('--tq-surface-raised');
  private readonly sunkenColor: string = chartToken('--tq-surface-sunken');
  private readonly canvasColor: string = chartToken('--tq-surface-canvas');
  private readonly borderColor: string = chartToken('--tq-border-strong');
  private readonly shadowColor: string = chartToken('--tq-shadow-color');
  private readonly textColor: string = chartToken('--tq-text');
  private readonly mutedTextColor: string = chartToken('--tq-text-muted');

  constructor(private readonly tqCurrencyPipe: TqCurrencyPipe, private readonly tqPercentPipe: TqPercentPipe,
              private readonly tqDecimalPipe: TqDecimalPipe, private readonly securityLogoUrlPipe: SecurityLogoUrlPipe) {
  }

  transform(
    positions: DepotPosition[],
    hideAbsoluteValues: boolean,
    currency: string,
    useBuyIn: boolean,
    groupingActive: boolean
  ): EChartsOption {
    if (!positions || positions.length === 0) {
      return {series: []};
    }

    const data = positions.map((pos: DepotPosition) => {
      const relative: string = this.tqPercentPipe.transform(
        useBuyIn ? pos.buyInRelative : pos.currentSizeRelative
      );

      const absoluteCurrency: string = this.tqCurrencyPipe.transform(
        useBuyIn ? pos.buyInAbsolute : pos.currentSizeAbsolute,
        currency
      );

      const absoluteCount: string = this.tqDecimalPipe.transform(pos.count, '1.0-3');
      const logoUrl: string = this.securityLogoUrlPipe.transform(pos.securityIds[0]);
      const logoRichOverride = {
        rich: {
          logo: {
            width: 18,
            height: 18,
            borderRadius: 4,
            backgroundColor: {image: logoUrl}
          }
        }
      };

      return {
        name: pos.displayName,
        value: useBuyIn ? pos.buyInAbsolute : pos.currentSizeAbsolute,
        relativeSize: relative,
        absoluteSize: hideAbsoluteValues
          ? ''
          : ` ${absoluteCurrency} (${absoluteCount}) `,
        label: logoRichOverride
      };
    });

    const labelFormatter = (params: any) =>
      `{logo|} {name| ${params.name}:} {size|${params.data.absoluteSize}} {relativeSize| ${params.data.relativeSize} } `;

    const label = {
      formatter: labelFormatter,
      backgroundColor: this.surfaceColor,
      borderColor: this.borderColor,
      borderWidth: 1,
      borderRadius: 8,
      shadowColor: this.shadowColor,
      shadowBlur: 8,
      padding: [6, 10],
      rich: {
        logo: {
          width: 18,
          height: 18,
          borderRadius: 4,
          align: 'center' as const,
          verticalAlign: 'middle' as const
        },
        name: {
          color: this.textColor,
          align: 'center' as const,
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 33
        },
        size: {
          color: this.mutedTextColor,
          align: 'center' as const
        },
        relativeSize: {
          align: 'center' as const,
          color: this.textColor,
          backgroundColor: this.sunkenColor,
          padding: [4, 4, 4, 4],
          borderRadius: 4
        }
      }
    };
    const labelLine = {length: positionPieChartGeometry.labelLineLength};

    return {
      series: [
        {
          name: '',
          type: 'pie',
          radius: [
            `${positionPieChartGeometry.doughnutInnerRadius * 2}%`,
            `${positionPieChartGeometry.doughnutOuterRadius * 2}%`
          ],
          startAngle: positionPieChartGeometry.pieStartAngleDegrees,
          data,
          ...(groupingActive
            ? {
              label: {show: false},
              labelLine: {show: false},
              emphasis: {
                label: {show: false},
                labelLine: {show: false}
              }
            }
            : {
              label,
              labelLine
            }),
          itemStyle: {
            borderRadius: 2,
            borderColor: this.canvasColor,
            borderWidth: 2
          }
        }
      ]
    };
  }
}
