import {StockSplit} from '../../../gen/api/security';

/**
 * Applies every stock split with an `exDate` after `date`, each contributing its `quantityNew / quantityOld` ratio once.
 *
 * @param securityCountOriginal the quantity before any split is applied.
 * @param date the transaction's date, compared against each split's `exDate`.
 * @param stockSplits the security's recorded stock splits; the order does not affect the result.
 * @returns the adjusted quantity, or `undefined` when no split applies.
 */
export function splitAdjustedCount(securityCountOriginal: number, date: string, stockSplits: StockSplit[]): number | undefined {
  const applying: StockSplit[] = stockSplits
    .filter((stockSplit: StockSplit): boolean => stockSplit.exDate > date)
    .sort((a: StockSplit, b: StockSplit): number => a.exDate.localeCompare(b.exDate));

  if (applying.length === 0) {
    return undefined;
  }

  return applying.reduce((count: number, stockSplit: StockSplit): number => count * (stockSplit.quantityNew / stockSplit.quantityOld),
    securityCountOriginal);
}
