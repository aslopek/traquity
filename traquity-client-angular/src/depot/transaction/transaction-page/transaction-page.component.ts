import {Component} from '@angular/core';
import {TransactionTableComponent} from '../transaction-table/transaction-table.component';
import {transactionPageStore} from '../transaction-store/transaction-page.store';

@Component({
  selector: 'app-transaction-page',
  imports: [
    TransactionTableComponent,
  ],
  providers: [transactionPageStore],
  templateUrl: 'transaction-page.component.html',
  styleUrls: ['transaction-page.component.scss'],
})
export class TransactionPageComponent {
}
