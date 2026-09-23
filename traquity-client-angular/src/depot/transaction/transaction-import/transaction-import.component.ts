import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatStep, MatStepper} from '@angular/material/stepper';
import {TitleToolbarComponent} from '../../../common/components/title-toolbar/title-toolbar.component';
import {ReadableTransactionImportStore, TransactionImportStore} from './store/transaction-import.store';
import {FileStepComponent} from './steps/file-step/file-step.component';
import {MappingStepComponent} from './steps/mapping-step/mapping-step.component';
import {ReviewStepComponent} from './steps/review-step/review-step.component';
import {ImportStepComponent} from './steps/import-step/import-step.component';

@Component({
  selector: 'app-transaction-import',
  imports: [TitleToolbarComponent, MatStepper, MatStep, FileStepComponent, MappingStepComponent, ReviewStepComponent, ImportStepComponent],
  providers: [TransactionImportStore],
  templateUrl: './transaction-import.component.html',
  styleUrl: './transaction-import.component.scss'
})
export class TransactionImportComponent {
  protected readonly transactionImportStore: ReadableTransactionImportStore = inject(TransactionImportStore);
  private readonly dialogRef: MatDialogRef<TransactionImportComponent> = inject(MatDialogRef);

  protected close(): void {
    if (this.transactionImportStore.phase() === 'importing') {
      this.transactionImportStore.cancelImport();
    }
    this.dialogRef.close();
  }
}
