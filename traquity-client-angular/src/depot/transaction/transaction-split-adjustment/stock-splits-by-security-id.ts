import {catchError, concatMap, from, map, Observable, of, toArray} from "rxjs";
import {StockSplit, StockSplitApi} from "../../../gen/api/security";

type SecuritySplits = [securityId: number, stockSplits: StockSplit[]];

/**
 * Looks up the recorded stock splits of every given security id, one request at a time.
 *
 * @param stockSplitApi the client the lookup is made through.
 * @param securityIds the ids to look up; an empty list emits an empty map without sending any request.
 * @returns a map from each id to its stock splits, empty for one whose lookup failed or that carries none.
 */
export function stockSplitsBySecurityId(stockSplitApi: StockSplitApi, securityIds: number[]): Observable<Map<number, StockSplit[]>> {
  return from(securityIds).pipe(
    concatMap((securityId: number): Observable<SecuritySplits> => stockSplitApi.getStockSplits(securityId).pipe(
      map((stockSplits: StockSplit[]): SecuritySplits => [securityId, stockSplits]),
      catchError((): Observable<SecuritySplits> => of([securityId, []]))
    )),
    toArray(),
    map((entries: SecuritySplits[]): Map<number, StockSplit[]> => new Map(entries))
  );
}
