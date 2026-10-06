import {Component, inject} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatStepperNext} from "@angular/material/stepper";
import {ReadableTransactionPdfImportStore, TransactionPdfImportStore} from "../../store/transaction-pdf-import.store";

@Component({
  selector: "app-securities-step",
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatStepperNext],
  templateUrl: "./securities-step.component.html",
  styleUrl: "./securities-step.component.scss"
})
export class SecuritiesStepComponent {
  protected readonly store: ReadableTransactionPdfImportStore = inject(TransactionPdfImportStore);
}
