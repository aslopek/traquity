import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Observable, tap} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {Actions} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {ConfigApi} from '../../../gen/api/configuration';
import {clientId} from '../../client-id';
import {AppConfigActions} from '../app-config.actions';
import {setChristmasTheme, SetChristmasThemeEffectArgs} from './set-christmas-theme.effect';

type MockedConfigApi = Pick<ConfigApi, 'setClientConfigValue'>;
type SetClientConfigValue = (clientId: string, clientConfigKey: string, body: string) => Observable<unknown>;

describe('setChristmasTheme', (): void => {
  let scheduler: TestScheduler;
  let actionValues: Record<string, Action>;
  let actionMarbles: string;
  let configResponseMarbles: string;
  let setClientConfigValue: jest.Mock<SetClientConfigValue>;
  let effectArgs: Omit<SetChristmasThemeEffectArgs, 'actions$'>;

  function expectEffect(expectedMarbles: string, expectedValues?: Record<string, Action>): Action[] {
    const emitted: Action[] = [];
    scheduler.run(({cold, hot, expectObservable}: RunHelpers): void => {
      setClientConfigValue.mockReturnValue(cold(configResponseMarbles));
      const actions$: Actions = new Actions(hot<Action>(actionMarbles, actionValues));
      const effect$: Observable<Action> = setChristmasTheme({actions$, ...effectArgs});
      expectObservable(effect$.pipe(tap((action: Action): number => emitted.push(action)))).toBe(expectedMarbles, expectedValues);
    });
    return emitted;
  }

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    actionMarbles = '-a';
    configResponseMarbles = '---(v|)';

    // marble alphabet of the action stream: `a` switches the theme off, `b` switches it on
    actionValues = {
      a: AppConfigActions.setChristmasTheme({christmasTheme: false}),
      b: AppConfigActions.setChristmasTheme({christmasTheme: true})
    };

    setClientConfigValue = jest.fn<SetClientConfigValue>();
    effectArgs = {
      configApi: {
        setClientConfigValue: setClientConfigValue as unknown as MockedConfigApi['setClientConfigValue']
      }
    };
  });

  it('stores the value and emits Set Christmas Theme Done', (): void => {
    const emitted: Action[] = expectEffect('----d', {
      d: AppConfigActions.setChristmasThemeDone({christmasTheme: false})
    });

    expect(emitted).toEqual([AppConfigActions.setChristmasThemeDone({christmasTheme: false})]);
    expect(setClientConfigValue).toHaveBeenCalledTimes(1);
    expect(setClientConfigValue).toHaveBeenCalledWith(clientId, 'app-config.christmas-theme', 'false');
  });

  it('emits Set Christmas Theme Done with the requested value when storing fails', (): void => {
    configResponseMarbles = '---#';

    const emitted: Action[] = expectEffect('----d', {
      d: AppConfigActions.setChristmasThemeDone({christmasTheme: false})
    });

    expect(emitted).toEqual([AppConfigActions.setChristmasThemeDone({christmasTheme: false})]);
  });

  it('stores a value requested while another is in flight after it, in order', (): void => {
    actionMarbles = '-ab';

    const emitted: Action[] = expectEffect('----d--e', {
      d: AppConfigActions.setChristmasThemeDone({christmasTheme: false}),
      e: AppConfigActions.setChristmasThemeDone({christmasTheme: true})
    });

    expect(emitted).toEqual([
      AppConfigActions.setChristmasThemeDone({christmasTheme: false}),
      AppConfigActions.setChristmasThemeDone({christmasTheme: true})
    ]);
    expect(setClientConfigValue.mock.calls).toEqual([
      [clientId, 'app-config.christmas-theme', 'false'],
      [clientId, 'app-config.christmas-theme', 'true']
    ]);
  });
});
