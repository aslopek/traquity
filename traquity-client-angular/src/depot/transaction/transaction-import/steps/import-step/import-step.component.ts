import {Component, computed, EventEmitter, inject, Output, Signal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {ReadableTransactionImportStore, TransactionImportStore} from '../../store/transaction-import.store';
import {buildFailedCsv} from '../../store/csv/build-failed-csv';
import {CsvRow} from '../../store/csv/csv.type';

@Component({
  selector: 'app-import-step',
  imports: [MatButtonModule, MatProgressBarModule, MatIcon],
  templateUrl: './import-step.component.html',
  styleUrl: './import-step.component.scss'
})
export class ImportStepComponent {
  @Output() closeRequested: EventEmitter<void> = new EventEmitter<void>();

  protected readonly transactionImportStore: ReadableTransactionImportStore = inject(TransactionImportStore);

  protected readonly progress: Signal<number> = computed((): number => {
    const total: number = this.transactionImportStore.requestsTotal();
    return total === 0 ? 0 : (this.transactionImportStore.requestsSent() / total) * 100;
  });

  protected downloadFailedCsv(): void {
    const failedIndices: Set<number> = new Set<number>(this.transactionImportStore.failedRowIndices());
    const failedRows: CsvRow[] = this.transactionImportStore.rows().filter((row: CsvRow): boolean => failedIndices.has(row.index));
    const csv: string = buildFailedCsv(this.transactionImportStore.headerRawLine(), failedRows);

    const blob: Blob = new Blob([csv], {type: 'text/csv'});
    const url: string = URL.createObjectURL(blob);
    const originalName: string = this.transactionImportStore.fileName() ?? 'transactions.csv';
    const dotIndex: number = originalName.lastIndexOf('.');
    const baseName: string = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;

    const anchor: HTMLAnchorElement = document.createElement('a');
    anchor.href = url;
    anchor.download = `${baseName}-failed.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected closeDialog(): void {
    this.closeRequested.emit();
  }
}
