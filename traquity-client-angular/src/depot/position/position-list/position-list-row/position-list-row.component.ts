import {Component, computed, inject, input, InputSignal, Signal,} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {Store} from "@ngrx/store";
import {TqIconComponent} from "../../../../common/components/tq-icon/tq-icon.component";
import {SecurityLogoUrlPipe} from "../../../../common/pipe/security-logo-url.pipe";
import {TqCurrencyPipe} from "../../../../common/pipe/tq-currency.pipe";
import {TqDecimalPipe} from "../../../../common/pipe/tq-decimal.pipe";
import {TqPercentPipe} from "../../../../common/pipe/tq-percent.pipe";
import {DepotPosition} from "../../../../gen/api/depot-position";
import {hideAbsoluteValues} from "../../../../store/app-config/app-config.selector";
import {AppState} from "../../../../store/app.state";
import {MatDialog} from "@angular/material/dialog";
import {LotsDialogComponent, LotsDialogData,} from "../../lots-dialog/lots-dialog.component";
import {IncomeByPosition} from "../../../../store/depot/depot.state";
import {Performance} from "../../../../gen/api/depot-performance";
import {incomeByPosition, selectedDepotCurrency, selectedDepotIds, usePositionBuyInValues,} from "../../../../store/depot/depot.selector";

@Component({
  selector: "app-position-list-row",
  imports: [
    TqCurrencyPipe,
    TqPercentPipe,
    TqIconComponent,
    TqDecimalPipe,
    SecurityLogoUrlPipe,
    MatTooltipModule,
  ],
  templateUrl: "./position-list-row.component.html",
  styleUrl: "./position-list-row.component.scss",
})
export class PositionListRowComponent {
  readonly position: InputSignal<DepotPosition> = input.required<DepotPosition>();

  protected readonly depotCurrency: Signal<string>;
  protected readonly useBuyIn: Signal<boolean>;
  protected readonly hideAbsoluteValues: Signal<boolean>;
  protected readonly depotIds: Signal<number[]>;
  protected readonly positionIncome: Signal<Performance | undefined>;
  private readonly dialog: MatDialog = inject(MatDialog);

  constructor(store: Store<AppState>) {
    this.depotCurrency = store.selectSignal(selectedDepotCurrency);
    this.useBuyIn = store.selectSignal(usePositionBuyInValues);
    this.hideAbsoluteValues = store.selectSignal(hideAbsoluteValues);
    this.depotIds = store.selectSignal(selectedDepotIds);
    const income: Signal<IncomeByPosition> = store.selectSignal(incomeByPosition);
    this.positionIncome = computed((): Performance | undefined => income()[this.position().securityIds[0]]);
  }

  protected openLotsDialog(): void {
    this.dialog.open(LotsDialogComponent, {
      height: "90%",
      width: "30%",
      minHeight: "15em",
      minWidth: "5em",
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      data: {
        depotIds: this.depotIds(),
        securityIds: this.position().securityIds,
      } satisfies LotsDialogData,
    });
  }
}
