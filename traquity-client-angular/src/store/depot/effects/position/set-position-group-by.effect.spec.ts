import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Observable, of} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {setPositionGroupBy, SetPositionGroupByEffectArgs} from './set-position-group-by.effect';
import {DepotActions} from '../../depot.actions';
import {ConfigApi} from '../../../../gen/api/configuration';
import {AppState} from '../../../app.state';
import {PositionGroupBy} from '../../position-grouping/position-group.type';
import {clientId} from '../../../client-id';
import {positionGroupBy as positionGroupByConfigKey} from '../../depot-config-keys';

type MockedStore = Pick<Store<AppState>, 'select'>;
type MockedConfigApi = Pick<ConfigApi, 'setClientConfigValue'>;
type SetClientConfigValue = (clientId: string, clientConfigKey: string, body: string) => Observable<unknown>;

describe('setPositionGroupBy', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let groupByInStore: PositionGroupBy;
  let actionMarbles: string;
  let configResponseMarbles: string;
  let setClientConfigValue: jest.Mock<SetClientConfigValue>;
  let store: Store<AppState>;
  let configApi: ConfigApi;
  let effectArgs: Omit<SetPositionGroupByEffectArgs, 'actions$'>;

  /**
   * Builds the action stream and the config API response inside virtual time, runs the effect and asserts its emissions.
   * The action stream is hot and never completes, so the effect's own emissions are the only thing the expectation sees.
   */
  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): void {
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      setClientConfigValue.mockReturnValue(cold(configResponseMarbles));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      expectObservable(setPositionGroupBy({actions$, ...effectArgs})).toBe(expectedMarbles, expectedValues);
    });
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    groupByInStore = 'sector';
    actionMarbles = '-a';
    configResponseMarbles = '---(v|)';

    // marble alphabet of the action stream: `a` and `b` set the position group by
    actionValues = {
      a: DepotActions.setPositionGroupBy({groupBy: 'sector'}),
      b: DepotActions.setPositionGroupBy({groupBy: 'none'})
    };

    store = {
      select: jest.fn((): Observable<PositionGroupBy> => of(groupByInStore)) as unknown as MockedStore['select']
    } satisfies MockedStore as Store<AppState>;

    setClientConfigValue = jest.fn<SetClientConfigValue>();
    configApi = {
      setClientConfigValue: setClientConfigValue as unknown as MockedConfigApi['setClientConfigValue']
    } satisfies MockedConfigApi as unknown as ConfigApi;

    effectArgs = {
      configApi,
      store
    };
  });

  it('dispatches Set Position Group By Done once the config value is stored', (): void => {
    expectEffect('----d', {d: DepotActions.setPositionGroupByDone({groupBy: 'sector'})});
    expect(setClientConfigValue).toHaveBeenCalledTimes(1);
    expect(setClientConfigValue).toHaveBeenCalledWith(clientId, positionGroupByConfigKey.key, 'sector');
  });

  it('dispatches Set Position Group By Done when storing the config value fails', (): void => {
    configResponseMarbles = '---#';
    expectEffect('----d', {d: DepotActions.setPositionGroupByDone({groupBy: 'sector'})});
  });

  it('stores the group by from the store rather than the one carried by the action', (): void => {
    actionMarbles = '-b';
    expectEffect('----d', {d: DepotActions.setPositionGroupByDone({groupBy: 'sector'})});
    expect(setClientConfigValue).toHaveBeenCalledTimes(1);
    expect(setClientConfigValue).toHaveBeenCalledWith(clientId, positionGroupByConfigKey.key, 'sector');
  });

  it('cancels an in-flight config call when the next Set Position Group By arrives', (): void => {
    actionMarbles = '-a-b';
    expectEffect('------d', {d: DepotActions.setPositionGroupByDone({groupBy: 'sector'})});
    expect(setClientConfigValue.mock.calls).toEqual([
      [clientId, positionGroupByConfigKey.key, 'sector'],
      [clientId, positionGroupByConfigKey.key, 'sector']
    ]);
  });
});
