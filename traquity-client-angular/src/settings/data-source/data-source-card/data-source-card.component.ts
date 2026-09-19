import {Component, computed, EventEmitter, inject, input, InputSignal, Output, Signal} from "@angular/core";
import {DataSourceWithId} from "../data-source.type";
import {MatIcon} from "@angular/material/icon";
import {DataSourceStore, ReadableDataSourceStore} from "../store/data-source.store";

@Component({
  selector: "app-data-source-card",
  imports: [
    MatIcon
  ],
  templateUrl: "./data-source-card.component.html",
  styleUrl: "./data-source-card.component.scss",
})
export class DataSourceCardComponent {

  readonly dataSource: InputSignal<DataSourceWithId | 'new'> = input.required<DataSourceWithId | 'new'>();
  @Output() readonly remove: EventEmitter<number> = new EventEmitter<number>();

  private readonly dataSourceStore: ReadableDataSourceStore = inject(DataSourceStore);
  protected readonly minimumIdForDeletion: Signal<number> = this.dataSourceStore.minimumIdForDeletion;
  protected readonly sideButtonDisabled: Signal<boolean> = computed((): boolean => {
    const ds: DataSourceWithId | 'new' = this.dataSource();
    return ds !== 'new' && ds.id < this.minimumIdForDeletion()
  });
  protected readonly isSelected: Signal<boolean> = computed((): boolean => {
    const ds: DataSourceWithId | 'new' = this.dataSource();
    const selected: number | null = this.dataSourceStore.selectedDataSourceId();
    return (ds === 'new' && selected === null) || (ds !== 'new' && ds.id === selected);
  });

  protected clickDataSource(): void {
    const ds: DataSourceWithId | 'new' = this.dataSource();
    if (ds === 'new') {
      this.dataSourceStore.selectDataSourceId(null);
    } else {
      this.dataSourceStore.selectDataSourceId(ds.id);
    }
  }

  protected clickSideButton(event: MouseEvent): void {
    event.stopPropagation();
    if (this.sideButtonDisabled()) {
      return;
    }

    const ds: DataSourceWithId | 'new' = this.dataSource();
    if (ds === 'new') {
      this.clickDataSource();
      return;
    }

    if (ds.id >= this.minimumIdForDeletion()) {
      this.remove.emit(ds.id);
    }
  }
}
