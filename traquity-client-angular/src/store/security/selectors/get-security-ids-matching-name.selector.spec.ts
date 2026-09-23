import {beforeEach, describe, expect, it} from '@jest/globals';
import {securityReadFactory} from '../../../testing/security-read.factory';
import {SecurityRead} from '../../../gen/api/security';
import {SecurityState} from '../security.state';
import {getSecurityIdsMatchingNameSelector} from './get-security-ids-matching-name.selector';

describe('getSecurityIdsMatchingNameSelector', (): void => {
  let apple: SecurityRead;
  let microsoft: SecurityRead;
  let bracketed: SecurityRead;
  let state: Pick<SecurityState, 'securities'>;

  beforeEach((): void => {
    apple = securityReadFactory({id: 1, name: 'Apple Inc.'});
    microsoft = securityReadFactory({id: 2, name: 'Microsoft Corporation'});
    bracketed = securityReadFactory({id: 3, name: 'iShares Core MSCI World UCITS ETF (Acc)'});
    state = {
      securities: {
        [apple.id]: apple,
        [microsoft.id]: microsoft,
        [bracketed.id]: bracketed
      }
    };
  });

  it('answers with every security, sorted by name, on an empty filter', (): void => {
    expect(getSecurityIdsMatchingNameSelector(state, '')).toEqual([apple.id, bracketed.id, microsoft.id]);
  });

  it('answers with only the securities whose name contains the text', (): void => {
    expect(getSecurityIdsMatchingNameSelector(state, 'micro')).toEqual([microsoft.id]);
  });

  it('ignores case', (): void => {
    expect(getSecurityIdsMatchingNameSelector(state, 'MICRO')).toEqual([microsoft.id]);
  });

  it('ignores surrounding whitespace', (): void => {
    expect(getSecurityIdsMatchingNameSelector(state, '  micro ')).toEqual([microsoft.id]);
  });

  it('matches anywhere in the name', (): void => {
    expect(getSecurityIdsMatchingNameSelector(state, 'inc')).toEqual([apple.id]);
  });

  it('answers with nothing on no matches', (): void => {
    expect(getSecurityIdsMatchingNameSelector(state, 'zzz')).toEqual([]);
  });

  it('matches a bracket as text', (): void => {
    expect(getSecurityIdsMatchingNameSelector(state, '(Acc)')).toEqual([bracketed.id]);
  });

  it('survives a name with an unbalanced bracket', (): void => {
    const broken: SecurityRead = securityReadFactory({id: 4, name: 'Fund ((broken'});
    state = {securities: {...state.securities, [broken.id]: broken}};

    expect(getSecurityIdsMatchingNameSelector(state, 'Fund')).toEqual([broken.id]);
  });

  it('answers with both securities sharing a name, lowest id first', (): void => {
    const secondApple: SecurityRead = securityReadFactory({id: 4, name: apple.name});
    state = {securities: {...state.securities, [secondApple.id]: secondApple}};

    expect(getSecurityIdsMatchingNameSelector(state, 'Apple')).toEqual([apple.id, secondApple.id]);
  });

  it('answers with nothing while no security is known', (): void => {
    state = {securities: {}};

    expect(getSecurityIdsMatchingNameSelector(state, '')).toEqual([]);
  });
});
