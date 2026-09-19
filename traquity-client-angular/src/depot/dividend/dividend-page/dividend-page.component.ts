import {Component, computed, Signal,} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatSlideToggleChange, MatSlideToggleModule,} from "@angular/material/slide-toggle";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import html2canvas from "html2canvas-pro";
import {Timespan} from "../../../common";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {
  dividendAggregationTimespan,
  includeSpecialDividends,
  selectedDepotCurrency,
  selectedDepotIds,
  selectedDividendView,
  useDividendGrossValues,
} from "../../../store/depot/depot.selector";
import {dividendStore} from "../store/dividend.store";
import {DividendBarChartComponent} from "../dividend-bar-chart/dividend-bar-chart.component";
import {DividendYieldTableComponent} from "../dividend-yield-table/dividend-yield-table.component";
import {DepotActions} from "../../../store/depot/depot.actions";

type SelectedDividendView = "barchart" | "table";

@Component({
  selector: "app-dividend-page",
  imports: [
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatButtonToggleModule,
    DividendBarChartComponent,
    DividendYieldTableComponent,
  ],
  providers: [dividendStore],
  templateUrl: "./dividend-page.component.html",
  styleUrl: "./dividend-page.component.scss",
})
export class DividendPageComponent {
  protected readonly aggregationTimespan: Signal<Timespan>;
  protected readonly currency: Signal<string>;
  protected readonly includeSpecialDividends: Signal<boolean>;
  protected readonly selectedDepotIds: Signal<number[]>;
  protected readonly selectedView: Signal<SelectedDividendView>;
  protected readonly useGrossValues: Signal<boolean>;
  protected readonly showDiagramControls: Signal<boolean>;

  constructor(private readonly store: Store<AppState>) {
    this.aggregationTimespan = store.selectSignal(dividendAggregationTimespan);
    this.currency = store.selectSignal(selectedDepotCurrency);
    this.includeSpecialDividends = store.selectSignal(includeSpecialDividends);
    this.selectedDepotIds = store.selectSignal(selectedDepotIds);
    this.selectedView = store.selectSignal(selectedDividendView);
    this.useGrossValues = store.selectSignal(useDividendGrossValues);
    this.showDiagramControls = computed(
      (): boolean => this.selectedView() === "barchart",
    );
  }

  protected toggleUseGrossValues(event: MatSlideToggleChange): void {
    this.store.dispatch(
      DepotActions.setUseDividendGrossValues({useGrossValues: event.checked}),
    );
  }

  protected toggleIncludeSpecialDividends(event: MatSlideToggleChange): void {
    this.store.dispatch(
      DepotActions.setIncludeSpecialDividends({
        includeSpecialDividends: event.checked,
      }),
    );
  }

  protected async selectView(
    selectedView: SelectedDividendView,
  ): Promise<void> {
    this.store.dispatch(DepotActions.setSelectedDividendView({selectedView}));
  }

  protected async selectAggregationTimespan(timespan: Timespan): Promise<void> {
    this.store.dispatch(
      DepotActions.setDividendAggregationTimespan({timespan}),
    );
  }

  protected downloadImage(): void {
    const chart: HTMLDivElement = document.getElementById(
      "dividend-view-container",
    ) as HTMLDivElement;
    chart.classList.add("mat-app-background", "padding");
    html2canvas(chart as HTMLElement).then((canvas) => {
      const link: HTMLAnchorElement = document.createElement("a");
      link.download = "dividends.png";
      link.href = canvas.toDataURL();
      link.click();
    });
    chart.classList.remove("mat-app-background", "padding");
  }
}
