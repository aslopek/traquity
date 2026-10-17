import {Component, inject, Signal,} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatTooltipModule} from "@angular/material/tooltip";
import {Store} from "@ngrx/store";
import {PerformanceLabelComponent} from "../../../common/components/performance-label/performance-label.component";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqPercentPipe} from "../../../common/pipe/tq-percent.pipe";
import {
  depotBreakdownDialogData,
  groupBreakdownDialogData,
  openPerformanceBreakdownDialog,
} from "../../performance-breakdown/performance-breakdown-dialog/open-performance-breakdown-dialog";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";
import {AppState} from "../../../store/app.state";
import {Positions} from "../../../store/depot/depot.state";
import {
  groupedPositions, positions, selectedDepotCurrency, selectedDepotIds, usePositionBuyInValues,
} from "../../../store/depot/depot.selector";
import {GroupedPositions, PositionGroup} from "../../../store/depot/position-grouping/position-group.type";
import {PositionGroupTextPipe} from "../position-group-text.pipe";
import {PositionListRowComponent} from "./position-list-row/position-list-row.component";

@Component({
  selector: "app-position-list",
  imports: [
    TqCurrencyPipe,
    PerformanceLabelComponent,
    MatTooltipModule,
    PositionListRowComponent,
    PositionGroupTextPipe,
  ],
  providers: [TqCurrencyPipe, TqPercentPipe, PositionGroupTextPipe],
  templateUrl: "./position-list.component.html",
  styleUrl: "./position-list.component.scss",
})
export class PositionListComponent {
  protected readonly depotCurrency: Signal<string>;
  protected readonly useBuyIn: Signal<boolean>;
  protected readonly depotComposition: Signal<Positions>;
  protected readonly grouping: Signal<GroupedPositions>;
  protected readonly hideAbsoluteValues: Signal<boolean>;
  protected readonly depotIds: Signal<number[]>;
  private readonly dialog: MatDialog = inject(MatDialog);

  constructor(store: Store<AppState>) {
    this.depotCurrency = store.selectSignal(selectedDepotCurrency);
    this.useBuyIn = store.selectSignal(usePositionBuyInValues);
    this.depotComposition = store.selectSignal(positions);
    this.grouping = store.selectSignal(groupedPositions);
    this.hideAbsoluteValues = store.selectSignal(hideAbsoluteValues);
    this.depotIds = store.selectSignal(selectedDepotIds);
  }

  protected openGroupBreakdown(group: PositionGroup): void {
    openPerformanceBreakdownDialog(this.dialog, groupBreakdownDialogData(group, this.depotIds()));
  }

  protected openDepotBreakdown(): void {
    openPerformanceBreakdownDialog(this.dialog, depotBreakdownDialogData(this.depotIds()));
  }
}
