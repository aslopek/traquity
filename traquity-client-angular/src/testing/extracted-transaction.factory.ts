import {ExtractedTransaction} from '../bridge/ai-bridge.type';

export function extractedTransactionFactory(overrides: Partial<ExtractedTransaction> = {}): ExtractedTransaction {
  return {
    transactionType: 'SELL',
    date: '2024-02-02',
    securityCountOriginal: 10,
    grossValue: 1700,
    ...overrides
  };
}
