import {AfterViewInit, Component, DestroyRef, effect, Signal, ViewChild,} from "@angular/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatTooltipModule} from "@angular/material/tooltip";
import {Store} from "@ngrx/store";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqPercentPipe} from "../../../common/pipe/tq-percent.pipe";
import {Dividends, DividendYield} from "../../../gen/api/depot-dividend";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";
import {AppState} from "../../../store/app.state";
import {dividends, selectedDepotCurrency, useDividendGrossValues,} from "../../../store/depot/depot.selector";

@Component({
  selector: "app-dividend-yield-table",
  imports: [
    MatTableModule,
    MatSortModule,
    TqCurrencyPipe,
    TqPercentPipe,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: "./dividend-yield-table.component.html",
  styleUrl: "./dividend-yield-table.component.scss",
})
export class DividendYieldTableComponent implements AfterViewInit {
  protected readonly currency: Signal<string>;
  protected readonly useGrossValues: Signal<boolean>;
  private readonly allColumnNames = [
    "name",
    "regularDividendPaymentsPerYear",
    "estimatedPayment",
    "currentYield",
    "yieldOnCost",
  ];
  private readonly columnNamesWithoutAbsoluteValues = [
    "name",
    "regularDividendPaymentsPerYear",
    "currentYield",
    "yieldOnCost",
  ];
  protected columnNames: string[] = this.columnNamesWithoutAbsoluteValues;

  @ViewChild(MatSort) protected sort!: MatSort;
  protected readonly dataSource: MatTableDataSource<DividendYield> =
    new MatTableDataSource([] as DividendYield[]);

  constructor(destroyRef: DestroyRef, store: Store<AppState>) {
    this.currency = store.selectSignal(selectedDepotCurrency);
    this.useGrossValues = store.selectSignal(useDividendGrossValues);
    this.dataSource.filterPredicate = (
      data: DividendYield,
      filter: string,
    ): boolean => data.displayName.toLowerCase().includes(filter);

    store
      .select(hideAbsoluteValues)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((hideAbsoluteValues) => {
        this.columnNames = hideAbsoluteValues
          ? this.columnNamesWithoutAbsoluteValues
          : this.allColumnNames;
      });

    const d: Signal<Dividends | null> = store.selectSignal(dividends);
    effect((): void => {
      this.dataSource.data = d()?.dividendYield ?? [];
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  protected applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase();
  }

  protected clearFilter(input: HTMLInputElement): void {
    input.value = "";
    this.dataSource.filter = "";
  }
}
