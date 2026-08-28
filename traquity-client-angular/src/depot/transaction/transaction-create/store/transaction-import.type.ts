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
  securityName: string
  date: Date | null
  time: string
  securityCountOriginal: string
  grossValue: string
  tax: string
  fee: string
};
