import {TransactionRead, TransactionUpdate} from '../../gen/api/depot-transaction';

export type TransactionUpdateValues = {
  count: number
  grossValue: number
  tax: number | undefined
  fee: number | undefined
};

export function toTransactionUpdate(transaction: TransactionRead, values: TransactionUpdateValues): TransactionUpdate {
  const counts: Pick<TransactionUpdate, 'securityCountOriginal' | 'securityCountSplitAdjusted'> =
    transaction.securityCountSplitAdjusted == null
      ? {
        securityCountOriginal: values.count
      } : {
        securityCountOriginal: transaction.securityCountOriginal / transaction.securityCountSplitAdjusted * values.count,
        securityCountSplitAdjusted: values.count
      };
  return {
    ...transaction,
    ...counts,
    grossValue: values.grossValue,
    tax: values.tax === 0 ? undefined : values.tax,
    fee: values.fee === 0 ? undefined : values.fee
  };
}
