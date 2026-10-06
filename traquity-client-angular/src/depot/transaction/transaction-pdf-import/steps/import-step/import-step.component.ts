import {Component, EventEmitter, inject, Output} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {ReadableTransactionPdfImportStore, TransactionPdfImportStore} from "../../store/transaction-pdf-import.store";

@Component({
  selector: "app-import-step",
  imports: [MatButtonModule, MatIcon, MatProgressBarModule],
  templateUrl: "./import-step.component.html",
  styleUrl: "./import-step.component.scss"
})
export class ImportStepComponent {
  @Output() closeRequested: EventEmitter<void> = new EventEmitter<void>();

  protected readonly store: ReadableTransactionPdfImportStore = inject(TransactionPdfImportStore);

  protected closeDialog(): void {
    this.closeRequested.emit();
  }
}
