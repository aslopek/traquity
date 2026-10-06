import {Component, effect, inject, Signal, viewChild} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";
import {MatStep, MatStepper} from "@angular/material/stepper";
import {TitleToolbarComponent} from "../../../common/components/title-toolbar/title-toolbar.component";
import {ExtractStepComponent} from "./steps/extract-step/extract-step.component";
import {FolderStepComponent} from "./steps/folder-step/folder-step.component";
import {ImportStepComponent} from "./steps/import-step/import-step.component";
import {ReviewStepComponent} from "./steps/review-step/review-step.component";
import {SecuritiesStepComponent} from "./steps/securities-step/securities-step.component";
import {PdfImportPhase} from "./store/transaction-pdf-import.type";
import {ReadableTransactionPdfImportStore, TransactionPdfImportStore} from "./store/transaction-pdf-import.store";

@Component({
  selector: "app-transaction-pdf-import",
  imports: [
    TitleToolbarComponent,
    MatStepper,
    MatStep,
    FolderStepComponent,
    ExtractStepComponent,
    SecuritiesStepComponent,
    ReviewStepComponent,
    ImportStepComponent
  ],
  providers: [TransactionPdfImportStore],
  templateUrl: "./transaction-pdf-import.component.html",
  styleUrl: "./transaction-pdf-import.component.scss"
})
export class TransactionPdfImportComponent {
  protected readonly store: ReadableTransactionPdfImportStore = inject(TransactionPdfImportStore);
  private readonly dialogRef: MatDialogRef<TransactionPdfImportComponent> = inject(MatDialogRef);
  private readonly stepper: Signal<MatStepper | undefined> = viewChild(MatStepper);

  constructor() {
    effect((): void => {
      const phase: PdfImportPhase = this.store.phase();
      if (phase === "extracted") {
        // Deferred to a microtask: calling `next()` synchronously here can run one tick before the `Extract` step's
        // own `[completed]` binding (driven by this same `phase` signal) has been applied to the `MatStep`, which
        // makes the linear stepper silently refuse to advance.
        queueMicrotask((): void => this.stepper()?.next());
      }
    });
  }

  protected close(): void {
    this.store.cancel();
    this.dialogRef.close();
  }
}
