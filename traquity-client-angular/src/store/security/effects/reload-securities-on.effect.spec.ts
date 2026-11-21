import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Observable, of, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {securityReadFactory} from '../../../testing/security-read.factory';
import {SecurityActions} from '../security.actions';
import {securitiesById} from '../security.selector';
import {SecuritiesById} from '../security.state';
import {reloadSecuritiesOn, ReloadSecuritiesOnEffectArgs} from './reload-securities-on.effect';

type MockedStore = Pick<Store<AppState>, 'select'>;

describe('reloadSecuritiesOn', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let securitiesInStore: SecuritiesById;
  let select: jest.Mock<(selector: unknown) => Observable<SecuritiesById>>;
  let effectArgs: Omit<ReloadSecuritiesOnEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({hot, expectObservable}: RunHelpers): void => {
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = reloadSecuritiesOn({actions$, ...effectArgs});
      expectObservable(effect$.pipe(tap((action: Action): number => emitted.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return emitted;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-c';
    securitiesInStore = {1: securityReadFactory({id: 1})};

    // marble alphabet of the action stream: `c` and `d` set a request currency
    actionValues = {
      c: SecurityActions.setRequestCurrency({currency: 'USD'}),
      d: SecurityActions.setRequestCurrency({currency: 'CHF'})
    };

    select = jest.fn((): Observable<SecuritiesById> => of(securitiesInStore));
    effectArgs = {
      store: {select: select as unknown as MockedStore['select']} satisfies MockedStore as Store<AppState>
    };
  });

  it('reloads every security when the request currency is set while a security is loaded', (): void => {
    const emitted: Action[] = expectEffect('-l', {l: SecurityActions.loadAllSecurities()});

    expect(emitted).toEqual([SecurityActions.loadAllSecurities()]);
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(securitiesById);
  });

  it('reloads again for every changed request currency', (): void => {
    actionMarbles = '-c-d';

    const emitted: Action[] = expectEffect('-l-l', {l: SecurityActions.loadAllSecurities()});

    expect(emitted).toEqual([
      SecurityActions.loadAllSecurities(),
      SecurityActions.loadAllSecurities()
    ]);
  });

  it('reloads nothing when the request currency is set to the one it already is', (): void => {
    actionMarbles = '-c-c';

    const emitted: Action[] = expectEffect('-l', {l: SecurityActions.loadAllSecurities()});

    expect(emitted).toEqual([SecurityActions.loadAllSecurities()]);
  });

  it('reloads nothing while no security is loaded', (): void => {
    securitiesInStore = {};

    const emitted: Action[] = expectEffect('');

    expect(emitted).toEqual([]);
  });
});
