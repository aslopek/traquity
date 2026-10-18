import {TransactionRead} from '../../gen/api/depot-transaction';

const transactionTypeOrder = {
  'DIVIDEND': 1,
  'SPECIAL_DIVIDEND': 1,
  'TAX': 2,
  'BUY': 3,
  'SELL': 3
} as const;

export function sortTransactions(transactions: Pick<TransactionRead, 'date' | 'time' | 'transactionType'>[]): void {
  transactions.sort((a, b): number => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }

    const priorityA: number = transactionTypeOrder[a.transactionType];
    const priorityB: number = transactionTypeOrder[b.transactionType];
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const timeA: string = a.time ?? '00:00:00';
    const timeB: string = b.time ?? '00:00:00';
    return timeA.localeCompare(timeB);
  });
}
