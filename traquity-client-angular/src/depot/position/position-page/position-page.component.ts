import {Component, inject, Signal,} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import {MatTooltipModule} from "@angular/material/tooltip";
import html2canvas from "html2canvas-pro";
import {DepotRead} from "../../../gen/api/depot";
import {chartToken} from "../../../common/chart/chart-token";
import {PositionListComponent} from "../position-list/position-list.component";
import {PositionPieChartComponent} from "../position-pie-chart/position-pie-chart.component";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {positionGroupBy, selectedDepots, selectedPositionView, usePositionBuyInValues,} from "../../../store/depot/depot.selector";
import {DepotActions} from "../../../store/depot/depot.actions";
import {SecurityActions} from "../../../store/security/security.actions";
import {positionGroupAttributes} from "../../../store/depot/position-grouping/position-group-attributes";
import {PositionGroupAttribute} from "../../../store/depot/position-grouping/position-group-attribute.type";
import {PositionGroupBy} from "../../../store/depot/position-grouping/position-group.type";

type SelectedPositionView = "donut" | "list";

@Component({
  selector: "app-position-page",
  imports: [
    PositionPieChartComponent,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    PositionListComponent,
  ],
  templateUrl: "./position-page.component.html",
  styleUrl: "./position-page.component.scss",
})
export class PositionPageComponent {
  protected readonly positionGroupAttributes: readonly PositionGroupAttribute[] = positionGroupAttributes;

  protected readonly selectedDepots: Signal<DepotRead[]>;
  protected readonly useBuyIn: Signal<boolean>;
  protected readonly selectedView: Signal<SelectedPositionView>;
  protected readonly groupBy: Signal<PositionGroupBy>;
  private readonly store: Store<AppState> = inject(Store);

  constructor() {
    this.selectedDepots = this.store.selectSignal(selectedDepots);
    this.useBuyIn = this.store.selectSignal(usePositionBuyInValues);
    this.selectedView = this.store.selectSignal(selectedPositionView);
    this.groupBy = this.store.selectSignal(positionGroupBy);
    this.store.dispatch(SecurityActions.loadAllSecurities());
  }

  protected toggleUseBuyIn(): void {
    this.store.dispatch(
      DepotActions.setUsePositionBuyInValues({
        useBuyInValues: !this.useBuyIn(),
      }),
    );
  }

  protected selectView(selectedView: SelectedPositionView): void {
    this.store.dispatch(
      DepotActions.setSelectedPositionView({
        selectedView,
      }),
    );
  }

  protected selectGroupBy(groupBy: PositionGroupBy): void {
    this.store.dispatch(
      DepotActions.setPositionGroupBy({
        groupBy,
      }),
    );
  }

  protected downloadImage(): void {
    const chart: HTMLDivElement = document.getElementById(
      "position-view-container",
    ) as HTMLDivElement;
    chart.classList.add("screenshot");
    html2canvas(chart as HTMLElement, {
      useCORS: true,
      height: chart.scrollHeight,
      backgroundColor: chartToken("--tq-surface-canvas"),
    }).then((canvas) => {
      const link: HTMLAnchorElement = document.createElement("a");
      link.download = `${this.selectedDepots()[0].name} positions.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
    chart.classList.remove("screenshot");
  }
}
