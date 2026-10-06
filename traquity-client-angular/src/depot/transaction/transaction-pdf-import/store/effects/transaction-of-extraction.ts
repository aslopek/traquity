import {isValid, parse} from "date-fns";
import {ExtractedTransaction} from "../../../../../bridge/ai-bridge.type";
import {TransactionType} from "../../../../../gen/api/depot-transaction";
import {PdfTransactionDraft} from "../transaction-pdf-import.type";

const KNOWN_TYPES: readonly TransactionType[] = Object.values(TransactionType);

export function transactionOfExtraction(extracted: ExtractedTransaction): PdfTransactionDraft | null {
  const transactionType: TransactionType | undefined =
    KNOWN_TYPES.find((type: TransactionType): boolean => type === extracted.transactionType);
  if (transactionType === undefined) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(extracted.date) || !isValid(parse(extracted.date, "yyyy-MM-dd", new Date()))) {
    return null;
  }
  if (!Number.isFinite(extracted.securityCountOriginal) || !Number.isFinite(extracted.grossValue)) {
    return null;
  }

  return {
    date: extracted.date,
    time: normalizedTime(extracted.time),
    transactionType,
    securityCountOriginal: extracted.securityCountOriginal,
    grossValue: extracted.grossValue,
    tax: extracted.tax !== undefined && Number.isFinite(extracted.tax) ? extracted.tax : undefined,
    fee: extracted.fee !== undefined && Number.isFinite(extracted.fee) ? extracted.fee : undefined
  };
}

function normalizedTime(time: string | undefined): string | undefined {
  if (time === undefined) {
    return undefined;
  }
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}
