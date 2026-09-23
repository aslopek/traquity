import {Actions, ofType} from '@ngrx/effects';
import {DepotApi, DepotRead} from '../../../gen/api/depot';
import {firstValueFrom, Observable, switchMap} from 'rxjs';
import {Action} from '@ngrx/store';
import {DepotActions} from '../depot.actions';
import {AppActions} from '../../app.actions';
import {ConfigApi} from "../../../gen/api/configuration";
import {clientId} from "../../client-id";
import {
  depotConfigPrefix,
  dividendAggregationTimespan,
  dividendIncludeSpecialDividends,
  dividendSelectedView,
  dividendUseGrossValues,
  positionGroupBy,
  positionSelectedView,
  positionUseBuyIn,
  selectedDepotIds,
  selectedTabIndex
} from "../depot-config-keys";
import {DepotState, DividendView, PositionView} from "../depot.state";
import {Timespan} from "../../../common/types/timespan";
import {positionGroupByValues} from "../position-grouping/position-group-attributes";
import {PositionGroupBy} from "../position-grouping/position-group.type";

export type InitializeDepotsSliceEffectArgs = {
  actions$: Actions,
  configApi: ConfigApi,
  depotApi: DepotApi
};

export function initializeDepotsSlice(effectArgs: InitializeDepotsSliceEffectArgs): Observable<Action> {
  const {
    actions$
  } = effectArgs;
  return actions$.pipe(
    ofType(AppActions.initialize),
    switchMap(async () => initializeDepotsSliceHelper(effectArgs))
  );
}

async function initializeDepotsSliceHelper(effectArgs: InitializeDepotsSliceEffectArgs): Promise<Action> {
  const {
    configApi,
    depotApi
  } = effectArgs;

  try {
    const depots: DepotRead[] = await firstValueFrom(depotApi.getDepots());
    const config: { [key: string]: string } = await firstValueFrom(configApi.getClientConfig(clientId, depotConfigPrefix));
    const selectedDepotIdsValue: number[] = parseNumberArray(config[selectedDepotIds.key]) ?? selectedDepotIds.default;
    const selectedTabIndexValue: number = config[selectedTabIndex.key] == null ? selectedTabIndex.default : parseInt(config[selectedTabIndex.key]);

    return DepotActions.setDepotsSlice({
      depots,
      selectedDepotIds: selectedDepotIdsValue,
      selectedTabIndex: selectedTabIndexValue,
      ...parseDividendConfig(config),
      ...parsePositionConfig(config),
      performance: {
        performance: null
      }
    });
  } catch {
    return DepotActions.setDepotsSlice({
      depots: [],
      selectedDepotIds: selectedDepotIds.default,
      selectedTabIndex: selectedTabIndex.default,
      ...parseDividendConfig({}),
      ...parsePositionConfig({}),
      performance: {
        performance: null
      }
    });
  }
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[], defaultValue: T): T {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : defaultValue;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return defaultValue;
}

function parseDividendConfig(config: { [key: string]: string }): Pick<DepotState, 'dividend'> {
  return {
    dividend: {
      dividends: null,
      aggregationTimespan: parseEnum<Timespan>(
        config[dividendAggregationTimespan.key], ['month', 'quarter', 'year'], dividendAggregationTimespan.default
      ),
      includeSpecialDividends: parseBoolean(config[dividendIncludeSpecialDividends.key], dividendIncludeSpecialDividends.default),
      selectedView: parseEnum<DividendView>(config[dividendSelectedView.key], ['barchart', 'table'], dividendSelectedView.default),
      useGrossValues: parseBoolean(config[dividendUseGrossValues.key], dividendUseGrossValues.default)
    }
  };
}

function parsePositionConfig(config: { [key: string]: string }): Pick<DepotState, 'position'> {
  return {
    position: {
      positions: null,
      incomeByPosition: {},
      selectedView: parseEnum<PositionView>(config[positionSelectedView.key], ['donut', 'list'], positionSelectedView.default),
      useBuyIn: parseBoolean(config[positionUseBuyIn.key], positionUseBuyIn.default),
      groupBy: parseEnum<PositionGroupBy>(config[positionGroupBy.key], positionGroupByValues, positionGroupBy.default)
    }
  };
}

function parseNumberArray(s: string | null): number[] | null {
  if (s == null) {
    return null;
  }

  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.every((n: unknown): n is number => typeof n === 'number')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
