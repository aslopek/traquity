import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Store} from '@ngrx/store';
import {SecurityNamePipe} from './security-name.pipe';
import {SecurityRead} from '../../gen/api/security';
import {securitiesById} from '../../store/security/security.selector';
import {SecuritiesById} from '../../store/security/security.state';
import {AppState} from '../../store/app.state';
import {securityReadFactory} from '../../testing/security-read.factory';

type MockedStore = Pick<Store<AppState>, 'selectSignal'>;

describe('SecurityNamePipe', (): void => {
  let security: SecurityRead;
  let getSecurities: jest.Mock<() => SecuritiesById>;
  let getDevMode: jest.Mock<() => boolean>;
  let store: Store<AppState>;
  let pipe: SecurityNamePipe;

  beforeEach((): void => {
    security = securityReadFactory();

    getSecurities = jest.fn((): SecuritiesById => ({[security.id]: security}));
    getDevMode = jest.fn((): boolean => false);
    store = {
      // the pipe reads two selectors; return the matching signal mock by selector identity
      selectSignal: jest.fn((selector: unknown): unknown => selector === securitiesById ? getSecurities : getDevMode
      ) as MockedStore['selectSignal']
    } satisfies MockedStore as Store<AppState>;

    pipe = new SecurityNamePipe(store);
  });

  it('returns the security name when the security is in the store and dev mode is inactive', (): void => {
    expect(pipe.transform(security.id)).toBe(security.name);
  });

  it('returns a placeholder containing the security id when the security is not in the store', (): void => {
    getSecurities.mockReturnValue({});
    expect(pipe.transform(security.id)).toBe(`Security ${security.id}`);
  });

  it('appends the security id to the name when dev mode is active', (): void => {
    getDevMode.mockReturnValue(true);
    expect(pipe.transform(security.id)).toBe(`${security.name} (${security.id})`);
  });
});
