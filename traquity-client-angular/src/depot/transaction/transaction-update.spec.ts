import {beforeEach, describe, expect, it} from '@jest/globals';
import {TransactionRead, TransactionUpdate} from '../../gen/api/depot-transaction';
import {transactionReadFactory} from '../../testing/transaction-read.factory';
import {toTransactionUpdate, TransactionUpdateValues} from './transaction-update';

describe('toTransactionUpdate', (): void => {
  let transaction: TransactionRead;
  let unchanged: TransactionRead;
  let values: TransactionUpdateValues;

  beforeEach((): void => {
    transaction = transactionReadFactory();
    unchanged = transactionReadFactory();
    values = {
      count: 20,
      grossValue: 2000,
      tax: 7,
      fee: 3
    };
  });

  it('takes the edited values over the transaction', (): void => {
    const update: TransactionUpdate = toTransactionUpdate(transaction, values);

    expect(update).toEqual({
      ...unchanged,
      securityCountOriginal: values.count,
      grossValue: values.grossValue,
      tax: values.tax,
      fee: values.fee
    });
  });

  it('leaves the transaction untouched', (): void => {
    toTransactionUpdate(transaction, values);

    expect(transaction).toEqual(unchanged);
  });

  it('sends a tax of zero as absent', (): void => {
    values = {
      ...values,
      tax: 0
    };

    const update: TransactionUpdate = toTransactionUpdate(transaction, values);

    expect(update.tax).toBeUndefined();
  });

  it('sends a fee of zero as absent', (): void => {
    values = {
      ...values,
      fee: 0
    };

    const update: TransactionUpdate = toTransactionUpdate(transaction, values);

    expect(update.fee).toBeUndefined();
  });

  it('scales the original count of a split-adjusted transaction by the split factor', (): void => {
    transaction = transactionReadFactory({
      securityCountOriginal: 10,
      securityCountSplitAdjusted: 40
    });

    const update: TransactionUpdate = toTransactionUpdate(transaction, values);

    expect(update.securityCountOriginal).toBe(5);
    expect(update.securityCountSplitAdjusted).toBe(20);
  });
});
