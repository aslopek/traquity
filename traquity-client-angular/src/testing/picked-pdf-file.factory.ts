import {PickedPdfFile} from '../depot/transaction/transaction-pdf-import/store/transaction-pdf-import.type';

export function pickedPdfFileFactory(overrides: Partial<PickedPdfFile> = {}): PickedPdfFile {
  return {
    path: '/statements/settlement.pdf',
    file: {
      name: 'settlement.pdf',
      type: 'application/pdf',
      arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(0))
    },
    ...overrides
  };
}
