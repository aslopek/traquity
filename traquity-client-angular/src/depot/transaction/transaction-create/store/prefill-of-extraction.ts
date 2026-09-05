import {ExtractedTransaction} from "../../../../bridge/ai-bridge.type";
import {TransactionType} from "../../../../gen/api/depot-transaction";
import {SecuritiesByIsin} from "../../../../store/security/selectors/get-securities-by-isin.selector";
import {ImportMessage, TransactionPrefill} from "./transaction-import.type";

export type PrefillResult = {
  prefill: TransactionPrefill
  message: ImportMessage
};

/**
 * What one extracted transaction offers the form, and what the dialog says about it.
 *
 * The security is resolved on the ISIN and on nothing else. A WKN, a ticker or a printed name would each widen the
 * lookup, and a near match filled into a form the user then confirms is how a wrong transaction gets recorded
 * without anyone noticing. A miss therefore leaves the field empty and says which ISIN was not found.
 *
 * The special-dividend checkbox is always offered unchecked. Nothing on a document states that a payment is one, so
 * the extraction carries `DIVIDEND` for every dividend and the distinction is left to the user.
 */
export function prefillOfExtraction(transaction: ExtractedTransaction, securitiesByIsin: SecuritiesByIsin,
                                    fileName: string): PrefillResult {
  const securityName: string = transaction.isin == null ? "" : securitiesByIsin[transaction.isin]?.name ?? "";

  return {
    prefill: {
      transactionType: transactionTypeOf(transaction.transactionType),
      isSpecialDividend: false,
      securityName,
      date: dateOf(transaction.date),
      time: transaction.time == null ? "" : transaction.time.slice(0, 5),
      securityCountOriginal: numberOf(transaction.securityCountOriginal),
      grossValue: numberOf(transaction.grossValue),
      tax: numberOf(transaction.tax),
      fee: numberOf(transaction.fee),
    },
    message: messageOf(transaction, securityName, fileName),
  };
}

function messageOf(transaction: ExtractedTransaction, securityName: string, fileName: string): ImportMessage {
  if (transaction.isin == null) {
    return {kind: "warning", text: `${fileName} named no ISIN that could be read. Please pick the security yourself.`};
  }
  if (securityName === "") {
    return {
      kind: "warning",
      text: `No security with ISIN ${transaction.isin} is known. Please pick the security yourself.`,
    };
  }
  return {kind: "info", text: `Filled from ${fileName}. Please check every value before creating the transaction.`};
}

/**
 * The extracted type is one of the app's own, so this is a lookup and never a parse. An unknown value leaves the
 * field empty, which the form's own `required` rule then reports.
 */
function transactionTypeOf(extracted: ExtractedTransaction["transactionType"]): TransactionType | null {
  const known: TransactionType[] = Object.values(TransactionType);
  return known.find((transactionType: TransactionType): boolean => transactionType === extracted) ?? null;
}

/** A `yyyy-MM-dd` date as a local `Date`, so the picker shows the day the document printed and not the one before. */
function dateOf(date: string): Date | null {
  const parts: number[] = date.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part: number): boolean => !Number.isFinite(part))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function numberOf(value: number | undefined): string {
  return value == null ? "" : String(value);
}
