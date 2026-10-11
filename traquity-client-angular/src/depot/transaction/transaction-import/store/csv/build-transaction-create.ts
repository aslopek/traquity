import {format, parse} from 'date-fns';
import {StockSplit} from '../../../../../gen/api/security';
import {TransactionCreate, TransactionType} from '../../../../../gen/api/depot-transaction';
import {splitAdjustedCount} from '../../../transaction-split-adjustment/split-adjusted-count';
import {padTimeWithSeconds} from '../../../../../common/functions/pad-time-with-seconds';
import {ColumnMapping, CsvRow} from './csv.type';
import {parseDecimal} from './parse-decimal';
import {lookupTransactionType} from './lookup-transaction-type';

function normalizeTime(value: string): string | undefined {
  const trimmed: string = value.trim();
  return trimmed.length === 0 ? undefined : padTimeWithSeconds(trimmed);
}

export function buildTransactionCreate(row: CsvRow, columnMapping: ColumnMapping, securityId: number, dateFormat: string,
                                       decimalSeparator: ',' | '.',
                                       transactionTypeMapping: { [csvValue: string]: TransactionType | null },
                                       stockSplits: StockSplit[]): TransactionCreate {
  const dateCell: string = row.values[columnMapping.date!].trim();
  const date: string = format(parse(dateCell, dateFormat, new Date()), 'yyyy-MM-dd');

  const typeCell: string = row.values[columnMapping.transactionType!].trim();
  const transactionType: TransactionType = lookupTransactionType(transactionTypeMapping, typeCell)!;

  const securityCountOriginal: number = parseDecimal(row.values[columnMapping.securityCountOriginal!], decimalSeparator)!;
  const grossValue: number = parseDecimal(row.values[columnMapping.grossValue!], decimalSeparator)!;

  const time: string | undefined = columnMapping.time !== undefined ? normalizeTime(row.values[columnMapping.time] ?? '') : undefined;
  const tax: number | undefined = columnMapping.tax !== undefined
    ? parseDecimal(row.values[columnMapping.tax] ?? '', decimalSeparator) ?? undefined
    : undefined;
  const fee: number | undefined = columnMapping.fee !== undefined
    ? parseDecimal(row.values[columnMapping.fee] ?? '', decimalSeparator) ?? undefined
    : undefined;

  return {
    date,
    time,
    securityId,
    transactionType,
    securityCountOriginal,
    securityCountSplitAdjusted: splitAdjustedCount(securityCountOriginal, date, stockSplits),
    grossValue,
    tax,
    fee
  };
}
