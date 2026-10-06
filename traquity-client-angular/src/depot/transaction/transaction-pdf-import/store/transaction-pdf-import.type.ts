import {TransactionCreate} from "../../../../gen/api/depot-transaction";
import {ImportedFile} from "../../transaction-pdf/imported-file";

export type PdfImportPhase = "folder" | "extracting" | "extracted" | "importing" | "imported";

/** One PDF the picker listed, named by its fully qualified path. */
export type PickedPdfFile = {
  path: string
  file: ImportedFile
};

/** What a document stated, less the security it is to be booked on. */
export type PdfTransactionDraft = Omit<TransactionCreate, "securityId">;

/** One document that yielded a complete transaction including the security identified by its ISIN. */
export type CollectedTransaction = {
  path: string
  isin: string
  draft: PdfTransactionDraft
};

/** One document that yielded nothing, with a human-readable reason. */
export type FaultyFile = {
  path: string
  reason: string
};

export type TransactionPdfImportState = {
  folder: string | null
  files: PickedPdfFile[]
  phase: PdfImportPhase
  filesDone: number
  currentPath: string | null
  collected: CollectedTransaction[]
  faulty: FaultyFile[]
  namesByIsin: { [isin: string]: string }
  cancelled: boolean
  importDone: number
  securitiesCreated: number
  transactionsCreated: number
  failedIsins: string[]
};

export const initialState: TransactionPdfImportState = {
  folder: null,
  files: [],
  phase: "folder",
  filesDone: 0,
  currentPath: null,
  collected: [],
  faulty: [],
  namesByIsin: {},
  cancelled: false,
  importDone: 0,
  securitiesCreated: 0,
  transactionsCreated: 0,
  failedIsins: []
} as const;
