import {SecuritiesById} from '../../../../store/security/security.state';

export type BenchmarkSecurityOption = {
  securityId: number
  /** The day of the security's oldest known price, `null` if the security has no price information. */
  oldestPriceDate: string | null
  selectable: boolean
};

/**
 * Describes which of the given securities can be compared over a period starting on the given day. A security can be compared if its
 * oldest known price is dated on or before that day.
 *
 * @param securityIds the IDs of the securities to describe
 * @param securities the known securities by ID
 * @param oldestShownDay the first day of the period as `yyyy-MM-dd`; `null` for no period
 * @returns one option per given security, in the order of `securityIds`; empty if there is no period
 */
export function benchmarkSecurityOptions(securityIds: number[], securities: SecuritiesById,
                                         oldestShownDay: string | null): BenchmarkSecurityOption[] {
  if (oldestShownDay === null) {
    return [];
  }
  return securityIds.map((securityId: number): BenchmarkSecurityOption => {
    const oldestPriceDate: string | null = securities[securityId]?.priceMetaInfo?.oldestPriceDate ?? null;
    return {
      securityId,
      oldestPriceDate,
      selectable: oldestPriceDate !== null && oldestPriceDate <= oldestShownDay
    };
  });
}
