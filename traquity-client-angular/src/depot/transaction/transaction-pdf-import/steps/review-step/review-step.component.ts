import {Component, inject, Signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatStepperNext} from "@angular/material/stepper";
import {Store} from "@ngrx/store";
import {TqDatePipe} from "../../../../../common/pipe/tq-date.pipe";
import {TransactionTypeDisplayNamePipe} from "../../../../../common/pipe/transaction-type-display-name.pipe";
import {AppState} from "../../../../../store/app.state";
import {selectedDepotIds} from "../../../../../store/depot/depot.selector";
import {securitiesByIsin} from "../../../../../store/security/security.selector";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {ReadableTransactionPdfImportStore, TransactionPdfImportStore} from "../../store/transaction-pdf-import.store";

@Component({
  selector: "app-review-step",
  imports: [MatButtonModule, MatStepperNext, TqDatePipe, TransactionTypeDisplayNamePipe],
  templateUrl: "./review-step.component.html",
  styleUrl: "./review-step.component.scss"
})
export class ReviewStepComponent {
  protected readonly store: ReadableTransactionPdfImportStore = inject(TransactionPdfImportStore);
  private readonly globalStore: Store<AppState> = inject(Store);
  private readonly securitiesByIsin: Signal<SecuritiesByIsin> = this.globalStore.selectSignal(securitiesByIsin);
  private readonly depotIds: Signal<number[]> = this.globalStore.selectSignal(selectedDepotIds);

  protected startImport(): void {
    this.store.runImport({
      depotId: this.depotIds()[0],
      securitiesByIsin: this.securitiesByIsin()
    });
  }
}
