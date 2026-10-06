import {CollectedTransaction} from '../depot/transaction/transaction-pdf-import/store/transaction-pdf-import.type';

export function collectedTransactionFactory(overrides: Partial<CollectedTransaction> = {}): CollectedTransaction {
  return {
    path: '/statements/settlement.pdf',
    isin: 'US0378331005',
    draft: {date: '2024-02-02', transactionType: 'BUY', securityCountOriginal: 10, grossValue: 1700},
    ...overrides
  };
}
