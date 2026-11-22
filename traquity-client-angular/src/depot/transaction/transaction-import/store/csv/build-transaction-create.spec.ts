import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {format, parse} from 'date-fns';
import {StockSplit} from '../../../../../gen/api/security';
import {TransactionCreate, TransactionType} from '../../../../../gen/api/depot-transaction';
import {stockSplitFactory} from '../../../../../testing/stock-split.factory';
import {ColumnMapping, CsvRow} from './csv.type';
import {buildTransactionCreate} from './build-transaction-create';
import {splitAdjustedCount} from '../../../transaction-split-adjustment/split-adjusted-count';
import {padTimeWithSeconds} from '../../../../../common/functions/pad-time-with-seconds';
import {parseDecimal} from './parse-decimal';
import {lookupTransactionType} from './lookup-transaction-type';

jest.mock('date-fns', (): unknown => ({format: jest.fn(), parse: jest.fn()}));
jest.mock('../../../transaction-split-adjustment/split-adjusted-count', (): unknown => ({splitAdjustedCount: jest.fn()}));
jest.mock('../../../../../common/functions/pad-time-with-seconds', (): unknown => ({padTimeWithSeconds: jest.fn()}));
jest.mock('./parse-decimal', (): unknown => ({parseDecimal: jest.fn()}));
jest.mock('./lookup-transaction-type', (): unknown => ({lookupTransactionType: jest.fn()}));

type Format = (date: Date, formatString: string) => string;
type Parse = (dateString: string, formatString: string, referenceDate: Date) => Date;
type TransactionTypeMapping = { [csvValue: string]: TransactionType | null };

describe('buildTransactionCreate', (): void => {
  const securityId: number = 42;
  const dateFormat: string = 'dd.MM.yyyy';
  const decimalSeparator: ',' | '.' = '.';

  let columnMapping: ColumnMapping;
  let row: CsvRow;
  let transactionTypeMapping: TransactionTypeMapping;
  let stockSplits: StockSplit[];
  let formatMock: jest.Mock<Format>;
  let parseMock: jest.Mock<Parse>;

  beforeEach((): void => {
    jest.useFakeTimers({now: new Date(2026, 10, 22)});

    columnMapping = {date: 0, time: 1, transactionType: 2, securityCountOriginal: 3, grossValue: 4};
    row = {index: 0, rawLine: '', values: [' 02.02.2024 ', ' 10:30 ', ' BUY ', '10', '1700']};
    transactionTypeMapping = {BUY: TransactionType.BUY};
    stockSplits = [stockSplitFactory({exDate: '2024-05-20', quantityOld: 1, quantityNew: 4})];

    parseMock = parse as unknown as jest.Mock<Parse>;
    parseMock.mockReset();
    parseMock.mockReturnValue(new Date(2024, 1, 2));

    formatMock = format as unknown as jest.Mock<Format>;
    formatMock.mockReset();
    formatMock.mockReturnValue('2024-02-02');

    jest.mocked(lookupTransactionType).mockReset();
    jest.mocked(lookupTransactionType).mockReturnValue(TransactionType.BUY);

    jest.mocked(parseDecimal).mockReset();
    jest.mocked(parseDecimal).mockImplementation((value: string): number | null =>
      ({'10': 10, '1700': 1700} as Record<string, number>)[value] ?? null);

    jest.mocked(padTimeWithSeconds).mockReset();
    jest.mocked(padTimeWithSeconds).mockReturnValue('10:30:00');

    jest.mocked(splitAdjustedCount).mockReset();
    jest.mocked(splitAdjustedCount).mockReturnValue(40);
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  it('builds the transaction from the row\'s trimmed cells', (): void => {
    const result: TransactionCreate = buildTransactionCreate(row, columnMapping, securityId, dateFormat, decimalSeparator,
      transactionTypeMapping, stockSplits);

    expect(result).toEqual({
      date: '2024-02-02',
      time: '10:30:00',
      securityId: 42,
      transactionType: TransactionType.BUY,
      securityCountOriginal: 10,
      securityCountSplitAdjusted: 40,
      grossValue: 1700,
      tax: undefined,
      fee: undefined
    });
    expect(parseMock.mock.calls).toEqual([['02.02.2024', 'dd.MM.yyyy', new Date(2026, 10, 22)]]);
    expect(formatMock.mock.calls).toEqual([[new Date(2024, 1, 2), 'yyyy-MM-dd']]);
    expect(jest.mocked(lookupTransactionType).mock.calls).toEqual([[{BUY: TransactionType.BUY}, 'BUY']]);
    expect(jest.mocked(parseDecimal).mock.calls).toEqual([['10', '.'], ['1700', '.']]);
    expect(jest.mocked(padTimeWithSeconds).mock.calls).toEqual([['10:30']]);
    expect(jest.mocked(splitAdjustedCount).mock.calls).toEqual([
      [10, '2024-02-02', [stockSplitFactory({exDate: '2024-05-20', quantityOld: 1, quantityNew: 4})]]
    ]);
  });

  it('leaves the split-adjusted quantity undefined when the split adjustment yields none', (): void => {
    jest.mocked(splitAdjustedCount).mockReturnValue(undefined);

    const result: TransactionCreate = buildTransactionCreate(row, columnMapping, securityId, dateFormat, decimalSeparator,
      transactionTypeMapping, stockSplits);

    expect(result).toEqual({
      date: '2024-02-02',
      time: '10:30:00',
      securityId: 42,
      transactionType: TransactionType.BUY,
      securityCountOriginal: 10,
      securityCountSplitAdjusted: undefined,
      grossValue: 1700,
      tax: undefined,
      fee: undefined
    });
  });
});
