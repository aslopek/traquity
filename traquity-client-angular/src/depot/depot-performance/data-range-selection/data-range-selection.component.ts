import {Component, inject, Signal} from "@angular/core";
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from "../store/depot-performance.store";
import {DataRange} from "../../../common/types/data-range";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";

@Component({
  selector: "app-data-range-selection",
  imports: [
    MatButtonToggleGroup,
    MatButtonToggle
  ],
  templateUrl: "./data-range-selection.component.html",
  styleUrl: "./data-range-selection.component.scss",
})
export class DataRangeSelectionComponent {

  private readonly depotPerformanceStore: ReadableDepotPerformanceStore = inject(DepotPerformanceStore);
  protected readonly dataRange: Signal<DataRange> = this.depotPerformanceStore.dataRange;

  protected setDataRange(dataRange: DataRange): void {
    this.depotPerformanceStore.setDataRange(dataRange);
  }
}
