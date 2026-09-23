import {Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatStepperNext} from '@angular/material/stepper';
import {TqDatePipe} from '../../../../../common/pipe/tq-date.pipe';
import {TransactionTypeDisplayNamePipe} from '../../../../../common/pipe/transaction-type-display-name.pipe';
import {ReadableTransactionImportStore, TransactionImportStore} from '../../store/transaction-import.store';

@Component({
  selector: 'app-review-step',
  imports: [MatButtonModule, MatStepperNext, TqDatePipe, TransactionTypeDisplayNamePipe],
  templateUrl: './review-step.component.html',
  styleUrl: './review-step.component.scss'
})
export class ReviewStepComponent {
  protected readonly transactionImportStore: ReadableTransactionImportStore = inject(TransactionImportStore);

  protected startImport(): void {
    void this.transactionImportStore.runImport();
  }
}
