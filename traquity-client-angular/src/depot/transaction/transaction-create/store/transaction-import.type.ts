import {TransactionType} from "../../../../gen/api/depot-transaction";

/** How prominently the dialog states what happened: a note, something to check, or a refusal. */
export type ImportMessageKind = "info" | "warning" | "error";

export type ImportMessage = {
  kind: ImportMessageKind
  text: string
};

export type TransactionPrefill = {
  transactionType: TransactionType | null
  isSpecialDividend: boolean
  /** The security the document's ISIN resolved to, or `null` when it named none or named an unknown one. */
  securityId: number | null
  date: Date | null
  time: string
  securityCountOriginal: string
  grossValue: string
  tax: string
  fee: string
};
