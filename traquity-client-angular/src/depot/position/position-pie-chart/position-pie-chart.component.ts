import {Component, inject, OnDestroy, Signal, signal, WritableSignal,} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {NgxEchartsDirective} from 'ngx-echarts';
import {TqIconComponent} from '../../../common/components/tq-icon/tq-icon.component';
import {SecurityLogoUrlPipe} from '../../../common/pipe/security-logo-url.pipe';
import {TqCurrencyPipe} from '../../../common/pipe/tq-currency.pipe';
import {TqDecimalPipe} from '../../../common/pipe/tq-decimal.pipe';
import {TqPercentPipe} from '../../../common/pipe/tq-percent.pipe';
import {openPositionDialog} from '../position-dialog/open-position-dialog';
import {PositionDialogData} from '../position-dialog/position-dialog.component';
import {
  depotBreakdownDialogData,
  groupBreakdownDialogData,
  openPerformanceBreakdownDialog,
} from '../../performance-breakdown/performance-breakdown-dialog/open-performance-breakdown-dialog';
import {hideAbsoluteValues} from '../../../store/app-config/app-config.selector';
import {ECElementEvent, ECharts} from 'echarts/core';
import {AppState} from '../../../store/app.state';
import {
  groupedPositions, positions, selectedDepotCurrency, selectedDepotIds, usePositionBuyInValues,
} from '../../../store/depot/depot.selector';
import {Positions} from '../../../store/depot/depot.state';
import {GroupedPositions, PositionGroup} from '../../../store/depot/position-grouping/position-group.type';
import {PositionPieChartPipe} from './position-pie-chart.pipe';
import {PositionGroupTextPipe} from '../position-group-text.pipe';
import {PositionGroupArc, PositionGroupArcsPipe} from './position-group-arcs.pipe';
import {PositionPieChartGeometry, positionPieChartGeometry} from './position-pie-chart-geometry';
import {DepotPosition} from '../../../gen/api/depot-position';

type HoverPoint = {
  x: number
  y: number
};

@Component({
  selector: 'app-position-pie-chart',
  imports: [TqCurrencyPipe, TqPercentPipe, TqDecimalPipe, NgxEchartsDirective, PositionPieChartPipe, PositionGroupArcsPipe,
    TqIconComponent, SecurityLogoUrlPipe],
  providers: [TqCurrencyPipe, TqDecimalPipe, TqPercentPipe, PositionGroupTextPipe, PositionGroupArcsPipe, SecurityLogoUrlPipe],
  templateUrl: './position-pie-chart.component.html',
  styleUrl: './position-pie-chart.component.scss',
})
export class PositionPieChartComponent implements OnDestroy {
  private chartInstance: ECharts | null = null;

  protected readonly geometry: PositionPieChartGeometry = positionPieChartGeometry;

  protected readonly hideAbsoluteValues: Signal<boolean>;
  protected readonly currency: Signal<string>;
  protected readonly useBuyIn: Signal<boolean>;
  protected readonly depotComposition: Signal<Positions>;
  protected readonly grouping: Signal<GroupedPositions>;

  protected readonly hoveredPosition: WritableSignal<DepotPosition | null> = signal(null);
  protected readonly hoverPoint: WritableSignal<HoverPoint | null> = signal(null);

  protected readonly hoveredGroupArc: WritableSignal<PositionGroupArc | null> = signal(null);
  protected readonly groupHoverPoint: WritableSignal<HoverPoint | null> = signal(null);

  protected readonly depotIds: Signal<number[]>;
  private readonly dialog: MatDialog = inject(MatDialog);

  constructor(store: Store<AppState>) {
    this.hideAbsoluteValues = store.selectSignal(hideAbsoluteValues);
    this.currency = store.selectSignal(selectedDepotCurrency);
    this.useBuyIn = store.selectSignal(usePositionBuyInValues);
    this.depotComposition = store.selectSignal(positions);
    this.grouping = store.selectSignal(groupedPositions);
    this.depotIds = store.selectSignal(selectedDepotIds);
  }

  ngOnDestroy(): void {
    if (this.chartInstance != null) {
      this.chartInstance.dispose();
    }
  }

  protected onChartInit(e: ECharts): void {
    this.chartInstance = e;
  }

  protected onChartMouseOver(event: ECElementEvent): void {
    if (event.componentType !== 'series' || event.dataIndex == null || event.event == null) {
      return;
    }

    const position: DepotPosition | undefined = this.grouping().positions[event.dataIndex];
    if (position == null) {
      return;
    }

    this.hoveredPosition.set(position);
    this.hoverPoint.set({x: event.event.offsetX, y: event.event.offsetY});
  }

  protected onChartMouseOut(): void {
    this.hoveredPosition.set(null);
    this.hoverPoint.set(null);
  }

  protected onChartClick(event: ECElementEvent): void {
    if (event.componentType !== 'series' || event.dataIndex == null) {
      return;
    }

    const position: DepotPosition | undefined = this.grouping().positions[event.dataIndex];
    if (position == null) {
      return;
    }

    openPositionDialog(this.dialog, {
      depotIds: this.depotIds(),
      securityIds: position.securityIds,
      displayName: position.displayName,
    } satisfies PositionDialogData);
  }

  protected openGroupBreakdown(index: number): void {
    const group: PositionGroup | undefined = this.grouping().groups[index];
    if (group == null) {
      return;
    }

    openPerformanceBreakdownDialog(this.dialog, groupBreakdownDialogData(group, this.depotIds()));
  }

  protected openDepotBreakdown(): void {
    openPerformanceBreakdownDialog(this.dialog, depotBreakdownDialogData(this.depotIds()));
  }

  protected onGroupArcMouseMove(event: MouseEvent, arc: PositionGroupArc): void {
    this.hoveredGroupArc.set(arc);
    this.groupHoverPoint.set({x: event.offsetX, y: event.offsetY});
  }

  protected onGroupArcMouseLeave(): void {
    this.hoveredGroupArc.set(null);
    this.groupHoverPoint.set(null);
  }
}
