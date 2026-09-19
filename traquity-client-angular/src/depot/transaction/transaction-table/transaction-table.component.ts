import {AsyncPipe} from "@angular/common";
import {Component, DestroyRef, EventEmitter, inject, Signal, signal, viewChild, ViewContainerRef, WritableSignal,} from "@angular/core";
import {takeUntilDestroyed, toObservable} from "@angular/core/rxjs-interop";
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatPaginator, MatPaginatorModule, PageEvent,} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {MatTableModule} from "@angular/material/table";
import {MatTooltipModule} from "@angular/material/tooltip";
import {LetDirective} from "@ngrx/component";
import {Store} from "@ngrx/store";
import {filter, firstValueFrom, Observable, switchMap} from "rxjs";
import {
  TqCurrencyPipe,
  TqDatePipe,
  TqPercentPipe,
  SecurityNamePipe,
  TransactionTypeDisplayIconPipe,
  TransactionTypeDisplayNamePipe,
} from "../../../common";
import {TqNetValuePipe} from "../../../common/pipe/tq-net-value.pipe";
import {TransactionApi, TransactionRead, TransactionType, TransactionUpdate,} from "../../../gen/api/depot-transaction";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";
import {DepotActions} from "../../../store/depot/depot.actions";
import {selectedDepotCurrency, selectedDepotIds} from "../../../store/depot/depot.selector";
import {TransactionCreateComponent} from "../transaction-create/transaction-create.component";
import {TransactionDeleteComponent} from "../transaction-delete/transaction-delete.component";
import {TransactionImportComponent} from "../transaction-import/transaction-import.component";
import {TableInputFieldComponent} from "./table-input-field/table-input-field.component";
import {AppState} from "../../../store/app.state";
import {ReadableTransactionPageStore, transactionPageStore} from "../transaction-store/transaction-page.store";

@Component({
  selector: "app-transaction-table",
  imports: [
    MatTableModule,
    SecurityNamePipe,
    TransactionTypeDisplayIconPipe,
    TransactionTypeDisplayNamePipe,
    MatIconModule,
    AsyncPipe,
    MatPaginatorModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatSelectModule,
    TqCurrencyPipe,
    TqDatePipe,
    TqPercentPipe,
    TableInputFieldComponent,
    TqNetValuePipe,
    LetDirective,
  ],
  templateUrl: "transaction-table.component.html",
  styleUrls: ["transaction-table.component.scss"],
})
export class TransactionTableComponent {
  private readonly allColumnNames: readonly string[] = [
    "time",
    "type",
    "security",
    "count",
    "gross_value",
    "net_value",
    "tax",
    "fee",
    "edit",
    "delete",
  ] as const;
  private readonly columnNamesWithoutAbsoluteValues: readonly string[] = [
    "time",
    "type",
    "security",
    "gross_value",
    "net_value",
  ] as const;

  protected readonly TransactionType = TransactionType;
  protected readonly columnNames: WritableSignal<readonly string[]> = signal<readonly string[]>(this.columnNamesWithoutAbsoluteValues);
  protected readonly paginator: Signal<MatPaginator | undefined> = viewChild(MatPaginator);

  protected securityNameFilter: FormControl<string[] | null> = new FormControl<string[] | null>([]);

  protected hoveredTransactionId: number | null = null;

  protected editTransaction: TransactionRead | null = null;
  protected updatedTransactionValues: null | {
    transactionType: TransactionType;
    count: number;
    grossValue: number;
    tax: number | undefined;
    fee: number | undefined;
  } = null;

  private readonly store: Store<AppState> = inject(Store);
  private readonly viewContainerRef: ViewContainerRef = inject(ViewContainerRef);
  protected readonly transactionPageStore: ReadableTransactionPageStore = inject(transactionPageStore);
  protected readonly depotCurrency: Signal<string> = this.store.selectSignal(selectedDepotCurrency);
  protected readonly hideAbsoluteValues$: Observable<boolean> = this.store.select(hideAbsoluteValues);

  constructor(
    private readonly dialog: MatDialog,
    private readonly transactionApi: TransactionApi,
    destroyRef: DestroyRef,
  ) {
    this.hideAbsoluteValues$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((hideAbsoluteValues: boolean): void => {
        this.columnNames.set(hideAbsoluteValues
          ? this.columnNamesWithoutAbsoluteValues
          : this.allColumnNames);
      });

    toObservable(this.paginator).pipe(
      filter((paginator: MatPaginator | undefined): paginator is MatPaginator => !!paginator),
      switchMap((paginator: MatPaginator): EventEmitter<PageEvent> => paginator.page),
      takeUntilDestroyed(destroyRef)
    ).subscribe((event: PageEvent): void => {
      this.transactionPageStore.loadPage(event.pageIndex);
    });
  }

  protected openCreateDialog(): void {
    this.dialog.open(TransactionCreateComponent, {
      viewContainerRef: this.viewContainerRef,
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      width: "40em",
      maxHeight: "90vh",
    });
  }

  protected openImportDialog(): void {
    this.dialog.open(TransactionImportComponent, {
      viewContainerRef: this.viewContainerRef,
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      width: "60rem",
      maxHeight: "90vh",
    });
  }

  getSecurityCount(transaction: TransactionRead): number {
    return (
      transaction.securityCountSplitAdjusted ??
      transaction.securityCountOriginal
    );
  }

  getGrossValuePerShare(transaction: TransactionRead): number {
    return transaction.grossValue / this.getSecurityCount(transaction);
  }

  protected getNetValuePerShare(transaction: TransactionRead): number {
    return transaction.netValue / this.getSecurityCount(transaction);
  }

  async deleteTransaction(transaction: TransactionRead): Promise<void> {
    const dialog: MatDialogRef<TransactionDeleteComponent> = this.dialog.open(
      TransactionDeleteComponent,
      {
        height: "20%",
        width: "25%",
        minHeight: "20em",
        minWidth: "25em",
        panelClass: "mat-app-background",
        autoFocus: false,
        disableClose: true,
      },
    );
    dialog.componentInstance.depotId = this.selectedDepotId();
    dialog.componentInstance.transaction = transaction;
    dialog.componentInstance.securityId = transaction.securityId;
    const transactionDeleted: boolean = await firstValueFrom(
      dialog.afterClosed(),
    );
    if (transactionDeleted) {
      this.transactionPageStore.loadPage(this.transactionPageStore.transactionPage().currentPage);
      this.store.dispatch(DepotActions.reloadDepots());
    }
  }

  protected toggleTransactionType(type: TransactionType): void {
    let types: TransactionType[] = this.transactionPageStore.filteredTransactionTypes();
    if (types.includes(type)) {
      types = types.filter((t: TransactionType): boolean => t !== type);
      if (type === TransactionType.DIVIDEND) {
        types = types.filter((t: TransactionType): boolean => t !== TransactionType.SPECIAL_DIVIDEND);
      }
    } else {
      types = [...types, type];
      if (type === TransactionType.DIVIDEND) {
        types = [...types, TransactionType.SPECIAL_DIVIDEND];
      }
    }
    this.transactionPageStore.setFilteredTransactionTypes(types);
  }

  protected filterSecurityNames(selection: string[]): void {
    this.transactionPageStore.setFilteredSecurityNames(selection);
  }

  protected setEditMode(transaction?: TransactionRead): void {
    if (transaction === undefined) {
      this.editTransaction = null;
      this.updatedTransactionValues = null;
    } else {
      this.editTransaction = transaction;
      this.updatedTransactionValues = {
        transactionType: transaction.transactionType,
        count: this.getSecurityCount(transaction),
        grossValue: transaction.grossValue,
        tax: transaction.tax,
        fee: transaction.fee,
      };
    }
  }

  protected setCount(count: number | undefined): void {
    if (
      this.updatedTransactionValues === null ||
      count === undefined ||
      count === 0
    ) {
      return;
    }
    this.updatedTransactionValues = {
      ...this.updatedTransactionValues,
      count,
    };
  }

  protected setGrossValue(grossValue: number | undefined): void {
    if (
      this.updatedTransactionValues === null ||
      grossValue === undefined ||
      grossValue === 0
    ) {
      return;
    }
    this.updatedTransactionValues = {
      ...this.updatedTransactionValues,
      grossValue,
    };
  }

  protected setTax(tax: number | undefined): void {
    if (this.updatedTransactionValues === null) {
      return;
    }
    this.updatedTransactionValues = {
      ...this.updatedTransactionValues,
      tax,
    };
  }

  protected setFee(fee: number | undefined): void {
    if (this.updatedTransactionValues === null) {
      return;
    }
    this.updatedTransactionValues = {
      ...this.updatedTransactionValues,
      fee,
    };
  }

  protected async updateTransaction(): Promise<void> {
    if (
      this.editTransaction === null ||
      this.updatedTransactionValues === null
    ) {
      return;
    }
    const update: TransactionUpdate = this.editTransaction;

    update.grossValue = this.updatedTransactionValues.grossValue;
    update.tax = this.updatedTransactionValues.tax;
    if (update.tax === 0) {
      update.tax = undefined;
    }
    update.fee = this.updatedTransactionValues.fee;
    if (update.fee === 0) {
      update.fee = undefined;
    }

    if (this.editTransaction.securityCountSplitAdjusted != null) {
      const factor: number =
        this.editTransaction.securityCountOriginal /
        this.editTransaction.securityCountSplitAdjusted;
      update.securityCountSplitAdjusted = this.updatedTransactionValues.count;
      update.securityCountOriginal =
        factor * this.updatedTransactionValues.count;
    } else {
      update.securityCountOriginal = this.updatedTransactionValues.count;
    }

    const transactionId: number = this.editTransaction.id;
    const updatedTransaction: TransactionRead = await firstValueFrom(
      this.transactionApi.updateTransaction(
        this.selectedDepotId(),
        transactionId,
        update,
      ),
    );

    this.transactionPageStore.replaceTransaction(updatedTransaction);
    this.store.dispatch(DepotActions.reloadDepots());

    this.setEditMode(undefined);
  }

  private selectedDepotId(): number {
    return this.store.selectSignal(selectedDepotIds)()[0];
  }
}
