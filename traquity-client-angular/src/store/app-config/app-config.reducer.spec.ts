import {beforeEach, describe, expect, it} from '@jest/globals';
import {AppConfigActions} from './app-config.actions';
import {appConfigReducer, initialState} from './app-config.reducer';
import {AppConfigState} from './app-config.state';

describe('appConfigReducer', (): void => {
  let state: AppConfigState;

  beforeEach((): void => {
    state = {...initialState};
  });

  describe('setAppConfig', (): void => {
    it('marks the config as loaded', (): void => {
      const result: AppConfigState = appConfigReducer(state, AppConfigActions.setAppConfig({
        dateFormat: 'dd.MM.yyyy',
        hideAbsoluteValues: false,
        openPage: 'depots',
        sideMenuOpen: true,
        locales: {
          currency: 'de-DE',
          date: 'de-DE',
          decimal: 'de-DE',
          percent: 'de-DE'
        },
      }));

      expect(result.loaded).toBe(true);
    });
  });
});
