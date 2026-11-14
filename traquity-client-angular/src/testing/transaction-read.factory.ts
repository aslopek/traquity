import {TransactionRead, TransactionType} from '../gen/api/depot-transaction';

export function transactionReadFactory(overrides?: Partial<TransactionRead>): TransactionRead {
  return {
    id: 1,
    version: 0,
    date: '2024-01-15',
    time: '10:00:00',
    securityId: 1,
    transactionType: TransactionType.BUY,
    securityCountOriginal: 10,
    grossValue: 1000,
    tax: 5,
    fee: 2,
    netValue: 1007,
    ...overrides
  };
}
