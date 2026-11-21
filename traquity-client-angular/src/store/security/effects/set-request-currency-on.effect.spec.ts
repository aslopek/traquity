import {beforeEach, describe, expect, it} from '@jest/globals';
import {Observable, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {DepotActions} from '../../depot/depot.actions';
import {SecurityActions} from '../security.actions';
import {setRequestCurrencyOn} from './set-request-currency-on.effect';

describe('setRequestCurrencyOn', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({hot, expectObservable}: RunHelpers): void => {
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = setRequestCurrencyOn({actions$});
      expectObservable(effect$.pipe(tap((action: Action): number => emitted.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return emitted;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-c';

    // marble alphabet of the action stream: `c` and `d` announce a currency
    actionValues = {
      c: DepotActions.selectedDepotCurrencyChanged({currency: 'USD'}),
      d: DepotActions.selectedDepotCurrencyChanged({currency: 'CHF'})
    };
  });

  it('sets the announced currency as the request currency', (): void => {
    const emitted: Action[] = expectEffect('-s', {
      s: SecurityActions.setRequestCurrency({currency: 'USD'})
    });

    expect(emitted).toEqual([SecurityActions.setRequestCurrency({currency: 'USD'})]);
  });

  it('sets every further announced currency', (): void => {
    actionMarbles = '-c-d';

    const emitted: Action[] = expectEffect('-s-t', {
      s: SecurityActions.setRequestCurrency({currency: 'USD'}),
      t: SecurityActions.setRequestCurrency({currency: 'CHF'})
    });

    expect(emitted).toEqual([
      SecurityActions.setRequestCurrency({currency: 'USD'}),
      SecurityActions.setRequestCurrency({currency: 'CHF'})
    ]);
  });

  it('sets nothing when the announced currency is the one it set last', (): void => {
    actionMarbles = '-c-c';

    const emitted: Action[] = expectEffect('-s', {
      s: SecurityActions.setRequestCurrency({currency: 'USD'})
    });

    expect(emitted).toEqual([SecurityActions.setRequestCurrency({currency: 'USD'})]);
  });
});
