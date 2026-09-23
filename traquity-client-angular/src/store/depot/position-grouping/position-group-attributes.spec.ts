import {beforeEach, describe, expect, it} from '@jest/globals';
import {getPositionGroupAttribute, positionGroupAttributes, positionGroupByValues} from './position-group-attributes';
import {PositionGroupAttribute} from './position-group-attribute.type';
import {SecurityRead} from '../../../gen/api/security';
import {securityReadFactory} from '../../../testing/security-read.factory';

describe('positionGroupAttributes', (): void => {
  describe('sector attribute', (): void => {
    let sector: PositionGroupAttribute;

    beforeEach((): void => {
      sector = positionGroupAttributes.find((attribute: PositionGroupAttribute): boolean => attribute.id === 'sector')!;
    });

    it('returns the first security\'s sector for a position with several securities', (): void => {
      const securities: SecurityRead[] = [
        securityReadFactory({id: 1, sector: 'Technology'}),
        securityReadFactory({id: 2, sector: 'Health Care'})
      ];
      expect(sector.resolve(securities)).toBe('Technology');
    });

    it('returns undefined for an empty array', (): void => {
      expect(sector.resolve([])).toBeUndefined();
    });
  });
});

describe('getPositionGroupAttribute', (): void => {
  it('returns the attribute for a known id', (): void => {
    const result: PositionGroupAttribute | null = getPositionGroupAttribute('sector');
    expect(result).toBe(positionGroupAttributes[0]);
  });

  it('returns null for an unknown id', (): void => {
    // @ts-expect-error testing an id outside the known union
    const result: PositionGroupAttribute | null = getPositionGroupAttribute('unknown');
    expect(result).toBeNull();
  });
});

describe('positionGroupByValues', (): void => {
  it('starts with none followed by every attribute id', (): void => {
    expect(positionGroupByValues).toEqual(['none', 'sector']);
  });
});
