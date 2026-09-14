import {TransactionType} from "../../../../gen/api/depot-transaction";

/** How prominently the dialog states what happened: a note, something to check, or a refusal. */
export type ImportMessageKind = "info" | "warning" | "error";

export type ImportMessage = {
  kind: ImportMessageKind
  text: string
};

/**
 * The values one extraction offers the form, each already in the notation its own field carries: a `Date` for the
 * date picker, `HH:mm` for the time input, and decimal strings for the amounts, since those fields are text inputs
 * validated by pattern.
 *
 * Every field is present. A key the document did not state arrives empty, which is what clears a value a previous
 * import left behind.
 */
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
