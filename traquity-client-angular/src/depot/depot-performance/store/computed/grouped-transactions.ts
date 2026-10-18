import {TransactionRead, TransactionType} from '../../../../gen/api/depot-transaction';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceState} from '../depot-performance.store';
import {computed, Signal} from '@angular/core';

export type TransactionWithCashFlow = TransactionRead & {
  /** Signed net value. */
  cashFlow: number
};

export type TransactionGroup = {
  date: string
  transactions: TransactionWithCashFlow[]
};

const negativeTransactions: TransactionType[] = ['BUY', 'TAX'] as const;

export function groupedTransaction(signalStore: ReadableSignalStore<DepotPerformanceState>): Signal<TransactionGroup[]> {
  const transactionsSignal: Signal<TransactionRead[]> = signalStore.transactions;
  return computed<TransactionGroup[]>((): TransactionGroup[] => {
    const result: TransactionGroup[] = [];
    const transactions: TransactionRead[] = transactionsSignal();
    if (transactions.length === 0) {
      return result;
    }

    let currentGroup: TransactionGroup = {
      date: transactions[0].date,
      transactions: []
    };
    result.push(currentGroup);

    for (const transaction of transactions) {
      if (transaction.date !== currentGroup.date) {
        currentGroup = {
          date: transaction.date,
          transactions: []
        }
        result.push(currentGroup);
      }
      currentGroup.transactions.push({
        ...transaction,
        cashFlow: negativeTransactions.includes(transaction.transactionType) ? 0 - transaction.netValue : transaction.netValue
      });
    }

    return result;
  });
}
