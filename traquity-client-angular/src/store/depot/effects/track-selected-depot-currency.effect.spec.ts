import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Observable, of, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {DepotActions} from '../depot.actions';
import {selectedDepotCurrency} from '../depot.selector';
import {initialState} from '../depot.reducer';
import {depotReadFactory} from '../../../testing/depot-read.factory';
import {trackSelectedDepotCurrency, TrackSelectedDepotCurrencyEffectArgs} from './track-selected-depot-currency.effect';

type MockedStore = Pick<Store<AppState>, 'select'>;

describe('trackSelectedDepotCurrency', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let currenciesInStore: string[];
  let select: jest.Mock<(selector: unknown) => Observable<string>>;
  let effectArgs: Omit<TrackSelectedDepotCurrencyEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const announced: Action[] = [];
    scheduler.run(({hot, expectObservable}: RunHelpers): void => {
      for (const currency of currenciesInStore) {
        select.mockReturnValueOnce(of(currency));
      }
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = trackSelectedDepotCurrency({actions$, ...effectArgs});
      expectObservable(effect$.pipe(tap((action: Action): number => announced.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return announced;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-s';
    currenciesInStore = ['EUR'];

    // marble alphabet of the action stream: `s`, `t`, `a` and `d` can change the currency
    actionValues = {
      s: DepotActions.setDepotsSlice({
        depots: [],
        selectedDepotIds: [],
        selectedTabIndex: initialState.selectedTabIndex,
        dividend: initialState.dividend,
        position: initialState.position,
        performance: initialState.performance
      }),
      t: DepotActions.toggleDepotSelection({depotId: 1}),
      a: DepotActions.addDepotSuccess({depot: depotReadFactory({id: 1})}),
      d: DepotActions.deleteDepotSuccess({depotId: 1})
    };

    select = jest.fn<(selector: unknown) => Observable<string>>();
    effectArgs = {
      store: {select: select as unknown as MockedStore['select']} satisfies MockedStore as Store<AppState>
    };
  });

  it('announces the currency after the first action that can change it', (): void => {
    const announced: Action[] = expectEffect('-c', {c: DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'})});
    expect(announced).toEqual([DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'})]);
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(selectedDepotCurrency);
  });

  it('announces a currency that differs from the one announced last', (): void => {
    actionMarbles = '-s-t';
    currenciesInStore = ['EUR', 'USD'];

    const announced: Action[] = expectEffect('-c-d', {
      c: DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'}),
      d: DepotActions.selectedDepotCurrencyChanged({currency: 'USD'})
    });
    expect(announced).toEqual([
      DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'}),
      DepotActions.selectedDepotCurrencyChanged({currency: 'USD'})
    ]);
    expect(select.mock.calls).toEqual([
      [selectedDepotCurrency],
      [selectedDepotCurrency]
    ]);
  });

  it('announces nothing when the currency stays the one announced last', (): void => {
    actionMarbles = '-t-t-t'; // three actions that might change the currency...
    currenciesInStore = ['EUR', 'EUR', 'EUR']; // ... but don't change it

    const announced: Action[] = expectEffect('-c', {
      c: DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'})
    });
    expect(announced).toEqual([
      DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'}) // so only the first action emits an announcement
    ]);
    expect(select.mock.calls).toEqual([
      [selectedDepotCurrency],
      [selectedDepotCurrency],
      [selectedDepotCurrency]
    ]);
  });

  it('reads the currency after adding, deleting and toggling a depot', (): void => {
    actionMarbles = '-t-a-d';
    currenciesInStore = ['EUR', 'USD', 'CHF'];

    const announced: Action[] = expectEffect('-c-d-e', {
      c: DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'}),
      d: DepotActions.selectedDepotCurrencyChanged({currency: 'USD'}),
      e: DepotActions.selectedDepotCurrencyChanged({currency: 'CHF'})
    });
    expect(announced).toEqual([
      DepotActions.selectedDepotCurrencyChanged({currency: 'EUR'}),
      DepotActions.selectedDepotCurrencyChanged({currency: 'USD'}),
      DepotActions.selectedDepotCurrencyChanged({currency: 'CHF'})
    ]);
    expect(select.mock.calls).toEqual([
      [selectedDepotCurrency],
      [selectedDepotCurrency],
      [selectedDepotCurrency]
    ]);
  });
});
