import {Component, computed, Signal,} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import {MatTooltipModule} from "@angular/material/tooltip";
import {TqCurrencySymbolPipe} from "../../common/pipe/tq-currency-symbol.pipe";
import {DepotRead} from "../../gen/api/depot";
import {DepotCreateComponent} from "../depot-create/depot-create.component";
import {DepotDeleteComponent} from "../depot-delete/depot-delete.component";
import {Store} from "@ngrx/store";
import {AppState} from "../../store/app.state";
import {depots, depotsByCurrency, isMultipleSelectionAllowed, selectedDepotIds, selectedDepots,} from "../../store/depot/depot.selector";
import {DepotsByCurrency} from "../../store/depot/selectors/get-all-depots-by-currency.selector";
import {DepotActions} from "../../store/depot/depot.actions";
import {DepotLogoUrlPipe} from "../../common/pipe/depot-logo-url.pipe";

@Component({
  selector: "app-depot-select",
  imports: [
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TqCurrencySymbolPipe,
    DepotLogoUrlPipe,
  ],
  templateUrl: "./depot-select.component.html",
  styleUrls: ["./depot-select.component.scss"],
})
export class DepotSelectComponent {
  protected readonly multipleSelectionAllowed: Signal<boolean>;
  protected readonly allDepotsByCurrency: Signal<DepotsByCurrency>;
  protected readonly allDepots: Signal<DepotRead[]>;
  protected readonly selectedDepots: Signal<DepotRead[]>;
  protected readonly selectedDepotIds: Signal<number[]>;
  protected readonly selectionDisabled: Signal<boolean>;
  protected readonly availableCurrencies: Signal<string[]>;

  constructor(
    private readonly dialog: MatDialog,
    private readonly store: Store<AppState>,
  ) {
    this.multipleSelectionAllowed = this.store.selectSignal(
      isMultipleSelectionAllowed,
    );
    this.allDepotsByCurrency = this.store.selectSignal(depotsByCurrency);
    this.allDepots = this.store.selectSignal(depots);
    this.selectedDepots = this.store.selectSignal(selectedDepots);
    this.selectedDepotIds = this.store.selectSignal(selectedDepotIds);
    this.selectionDisabled = computed(
      (): boolean => this.store.selectSignal(depots)().length < 2,
    );
    this.availableCurrencies = computed((): string[] => {
      const depotsByCurrency: DepotsByCurrency = this.allDepotsByCurrency();
      return Object.keys(depotsByCurrency);
    });
  }

  protected onDepotClick(depot: DepotRead): void {
    this.store.dispatch(
      DepotActions.toggleDepotSelection({depotId: depot.id}),
    );
  }

  protected createDepot(): void {
    this.dialog.open(DepotCreateComponent, {
      height: "20%",
      width: "25%",
      minHeight: "20em",
      minWidth: "25em",
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
    });
  }

  protected deleteDepot(): void {
    const depots: DepotRead[] = this.selectedDepots();
    if (depots.length !== 1) {
      return;
    }

    this.dialog.open(DepotDeleteComponent, {
      height: "20%",
      width: "25%",
      minHeight: "20em",
      minWidth: "25em",
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      data: {
        depot: this.selectedDepots()[0],
      },
    });
  }
}
