import {Component, inject} from "@angular/core";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {ReadableTransactionPdfImportStore, TransactionPdfImportStore} from "../../store/transaction-pdf-import.store";

@Component({
  selector: "app-extract-step",
  imports: [MatProgressBarModule],
  templateUrl: "./extract-step.component.html",
  styleUrl: "./extract-step.component.scss"
})
export class ExtractStepComponent {
  protected readonly store: ReadableTransactionPdfImportStore = inject(TransactionPdfImportStore);
}
