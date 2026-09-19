import {Component, computed, inject, Signal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatStepperNext} from '@angular/material/stepper';
import {ReadableTransactionImportStore, TransactionImportStore} from '../../store/transaction-import.store';

@Component({
  selector: 'app-file-step',
  imports: [MatButtonModule, MatStepperNext, MatIcon],
  templateUrl: './file-step.component.html',
  styleUrl: './file-step.component.scss'
})
export class FileStepComponent {
  protected readonly transactionImportStore: ReadableTransactionImportStore = inject(TransactionImportStore);
  protected readonly canProceed: Signal<boolean> = computed((): boolean => this.transactionImportStore.separator() !== null);

  protected async selectFile(event: Event): Promise<void> {
    const files: FileList | null = (event.target as HTMLInputElement).files;
    if (files !== null && files.length > 0) {
      await this.transactionImportStore.setFile(files[0]);
    }
  }
}
