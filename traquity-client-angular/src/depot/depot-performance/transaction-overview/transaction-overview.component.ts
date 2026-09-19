import {Component, inject, Signal} from "@angular/core";
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from "../store/depot-performance.store";
import {TransactionGroupComponent} from "./transaction-group/transaction-group.component";
import {TransactionGroup} from "../store/computed/grouped-transactions";
import {MatIcon} from "@angular/material/icon";

@Component({
  selector: "app-transaction-overview",
  imports: [
    TransactionGroupComponent,
    MatIcon
  ],
  templateUrl: "./transaction-overview.component.html",
  styleUrl: "./transaction-overview.component.scss",
})
export class TransactionOverviewComponent {

  private readonly depotPerformanceStore: ReadableDepotPerformanceStore = inject(DepotPerformanceStore);
  protected readonly transactionGroups: Signal<TransactionGroup[]> = this.depotPerformanceStore.groupedTransactions;
}
