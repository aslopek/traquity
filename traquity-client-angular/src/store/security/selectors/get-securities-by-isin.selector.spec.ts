import {beforeEach, describe, expect, it} from '@jest/globals';
import {securityReadFactory} from '../../../testing';
import {SecurityRead} from '../../../gen/api/security';
import {SecurityState} from '../security.state';
import {getSecuritiesByIsinSelector} from './get-securities-by-isin.selector';

describe('getSecuritiesByIsinSelector', (): void => {

  let apple: SecurityRead;
  let microsoft: SecurityRead;
  let state: Pick<SecurityState, 'securities'>;

  beforeEach((): void => {
    apple = securityReadFactory({id: 1, isin: 'US0378331005', name: 'Apple Inc.'});
    microsoft = securityReadFactory({id: 2, isin: 'US5949181045', name: 'Microsoft Corp.'});
    state = {securities: {[apple.id]: apple, [microsoft.id]: microsoft}};
  });

  it('keys every security by its ISIN', (): void => {
    expect(getSecuritiesByIsinSelector(state)).toEqual({[apple.isin]: apple, [microsoft.isin]: microsoft});
  });

  it('answers with nothing where no security is loaded', (): void => {
    state = {securities: {}};

    expect(getSecuritiesByIsinSelector(state)).toEqual({});
  });
});
