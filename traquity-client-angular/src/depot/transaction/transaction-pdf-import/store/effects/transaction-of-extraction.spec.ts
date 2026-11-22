import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {isValid, parse} from 'date-fns';
import {ExtractedTransaction} from '../../../../../bridge/ai-bridge.type';
import {extractedTransactionFactory as extractedFactory} from '../../../../../testing/extracted-transaction.factory';
import {transactionOfExtraction} from './transaction-of-extraction';
import {PdfTransactionDraft} from '../transaction-pdf-import.type';

jest.mock('date-fns', (): unknown => ({isValid: jest.fn(), parse: jest.fn()}));

type IsValid = (date: unknown) => boolean;
type Parse = (dateString: string, formatString: string, referenceDate: Date) => Date;

describe('transactionOfExtraction', (): void => {
  let isValidMock: jest.Mock<IsValid>;
  let parseMock: jest.Mock<Parse>;

  beforeEach((): void => {
    jest.useFakeTimers({now: new Date(2026, 10, 22)});

    parseMock = parse as unknown as jest.Mock<Parse>;
    parseMock.mockReset();
    parseMock.mockReturnValue(new Date(2024, 1, 2));

    isValidMock = isValid as unknown as jest.Mock<IsValid>;
    isValidMock.mockReset();
    isValidMock.mockReturnValue(true);
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  it('keeps every stated value, normalizing a time with no seconds', (): void => {
    const extracted: ExtractedTransaction = extractedFactory({time: '14:30', tax: 5, fee: 1});

    expect(transactionOfExtraction(extracted)).toEqual({
      date: extracted.date,
      time: '14:30:00',
      transactionType: extracted.transactionType,
      securityCountOriginal: extracted.securityCountOriginal,
      grossValue: extracted.grossValue,
      tax: 5,
      fee: 1
    } satisfies PdfTransactionDraft);
    expect(parseMock.mock.calls).toEqual([['2024-02-02', 'yyyy-MM-dd', new Date(2026, 10, 22)]]);
    expect(isValidMock.mock.calls).toEqual([[new Date(2024, 1, 2)]]);
  });

  it('leaves the time undefined when the document names none', (): void => {
    const extracted: ExtractedTransaction = extractedFactory();

    expect(transactionOfExtraction(extracted)?.time).toBeUndefined();
  });

  it('is faulty for a transaction type outside the known ones', (): void => {
    const extracted: ExtractedTransaction = extractedFactory({transactionType: 'DEPOSIT' as ExtractedTransaction['transactionType']});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it('is faulty for a malformed date', (): void => {
    const extracted: ExtractedTransaction = extractedFactory({date: '02/02/2024'});

    expect(transactionOfExtraction(extracted)).toBeNull();
    expect(parseMock).not.toHaveBeenCalled();
  });

  it('is faulty for a date that is not a real calendar day', (): void => {
    isValidMock.mockReturnValue(false);
    const extracted: ExtractedTransaction = extractedFactory({date: '2024-02-31'});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it('is faulty for a non-finite security count', (): void => {
    const extracted: ExtractedTransaction = extractedFactory({securityCountOriginal: Number.NaN});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it('is faulty for a non-finite gross value', (): void => {
    const extracted: ExtractedTransaction = extractedFactory({grossValue: Number.POSITIVE_INFINITY});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it('drops a non-finite tax instead of failing the whole document', (): void => {
    const extracted: ExtractedTransaction = extractedFactory({tax: Number.NaN});

    expect(transactionOfExtraction(extracted)?.tax).toBeUndefined();
  });
});
