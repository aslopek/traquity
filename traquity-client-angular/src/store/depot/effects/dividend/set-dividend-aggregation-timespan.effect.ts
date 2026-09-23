import {Actions, ofType} from "@ngrx/effects";
import {ConfigApi} from "../../../../gen/api/configuration";
import {Action, Store} from "@ngrx/store";
import {AppState} from "../../../app.state";
import {catchError, map, Observable, of, switchMap} from "rxjs";
import {DepotActions, SetDividendAggregationTimespanActionArgs} from "../../depot.actions";
import {concatLatestFrom} from "@ngrx/operators";
import {Timespan} from "../../../../common/types/timespan";
import {dividendAggregationTimespan as dividendAggregationTimespanSelector} from "../../depot.selector";
import {dividendAggregationTimespan as dividendAggregationTimespanConfigKey} from "../../depot-config-keys";
import {clientId} from "../../../client-id";

export type DividendAggregationTimespanEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function setDividendAggregationTimespan(effectArgs: DividendAggregationTimespanEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setDividendAggregationTimespan),
    concatLatestFrom((): Observable<Timespan> => store.select(dividendAggregationTimespanSelector)),
    switchMap(([, timespan]: [SetDividendAggregationTimespanActionArgs, Timespan]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, dividendAggregationTimespanConfigKey.key, timespan).pipe(
        map(() => DepotActions.setDividendAggregationTimespanDone({timespan})),
        catchError(() => of(DepotActions.setDividendAggregationTimespanDone({timespan})))
      );
    })
  );
}
