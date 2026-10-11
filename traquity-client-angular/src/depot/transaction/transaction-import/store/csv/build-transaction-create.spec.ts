import {describe, expect, it} from '@jest/globals';
import {StockSplit} from '../../../../../gen/api/security';
import {TransactionCreate, TransactionType} from '../../../../../gen/api/depot-transaction';
import {stockSplitFactory} from '../../../../../testing/stock-split.factory';
import {ColumnMapping, CsvRow} from './csv.type';
import {buildTransactionCreate} from './build-transaction-create';

describe('buildTransactionCreate', (): void => {
  const columnMapping: ColumnMapping = {date: 0, time: 1, transactionType: 2, securityCountOriginal: 3, grossValue: 4};
  const dateFormat: string = 'yyyy-MM-dd';
  const decimalSeparator: ',' | '.' = '.';
  const transactionTypeMapping: { [csvValue: string]: TransactionType | null } = {BUY: TransactionType.BUY};
  const securityId: number = 42;
  const date: string = '2024-02-02';
  const securityCountOriginal: number = 10;
  const row: CsvRow = {index: 0, rawLine: '', values: [date, '10:30', 'BUY', String(securityCountOriginal), '1700']};

  it('builds a transaction with no split-adjusted quantity when given no stock split', (): void => {
    const result: TransactionCreate = buildTransactionCreate(row, columnMapping, securityId, dateFormat, decimalSeparator,
      transactionTypeMapping, []);

    expect(result).toEqual({
      date,
      time: '10:30:00',
      securityId,
      transactionType: TransactionType.BUY,
      securityCountOriginal,
      grossValue: 1700
    });
    expect(result.securityCountSplitAdjusted).toBeUndefined();
  });

  it('applies a stock split with an exDate after the row\'s date to the split-adjusted quantity', (): void => {
    const applyingSplit: StockSplit = stockSplitFactory({exDate: '2024-05-20', quantityOld: 1, quantityNew: 4});

    const result: TransactionCreate = buildTransactionCreate(row, columnMapping, securityId, dateFormat, decimalSeparator,
      transactionTypeMapping, [applyingSplit]);

    expect(result.securityCountSplitAdjusted).toBe(securityCountOriginal * (applyingSplit.quantityNew / applyingSplit.quantityOld));
  });

  it('carries no split-adjusted quantity when the stock split\'s exDate is not after the row\'s date', (): void => {
    const notApplyingSplit: StockSplit = stockSplitFactory({exDate: date});

    const result: TransactionCreate = buildTransactionCreate(row, columnMapping, securityId, dateFormat, decimalSeparator,
      transactionTypeMapping, [notApplyingSplit]);

    expect(result.securityCountSplitAdjusted).toBeUndefined();
  });
});
