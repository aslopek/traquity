import {Component, Signal,} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {Store} from "@ngrx/store";
import {PerformanceLabelComponent} from "../../../common/components/performance-label/performance-label.component";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqPercentPipe} from "../../../common/pipe/tq-percent.pipe";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";
import {AppState} from "../../../store/app.state";
import {Positions} from "../../../store/depot/depot.state";
import {groupedPositions, positions, selectedDepotCurrency, usePositionBuyInValues,} from "../../../store/depot/depot.selector";
import {GroupedPositions} from "../../../store/depot/position-grouping/position-group.type";
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

  constructor(store: Store<AppState>) {
    this.depotCurrency = store.selectSignal(selectedDepotCurrency);
    this.useBuyIn = store.selectSignal(usePositionBuyInValues);
    this.depotComposition = store.selectSignal(positions);
    this.grouping = store.selectSignal(groupedPositions);
    this.hideAbsoluteValues = store.selectSignal(hideAbsoluteValues);
  }
}
