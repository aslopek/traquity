import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {getGroupedPositions} from './get-grouped-positions.selector';
import {Positions} from '../../depot.state';
import {SecuritiesById} from '../../../security/security.state';
import {GroupedPositions, PositionGroup, PositionGroupBy} from '../../position-grouping/position-group.type';
import {PositionGroupAttribute} from '../../position-grouping/position-group-attribute.type';
import {getPositionGroupAttribute} from '../../position-grouping/position-group-attributes';
import {depotPositionFactory} from '../../../../testing/depot-position.factory';
import {securityReadFactory} from '../../../../testing/security-read.factory';
import {DepotPosition} from '../../../../gen/api/depot-position';
import {SecurityRead} from '../../../../gen/api/security';

jest.mock('../../position-grouping/position-group-attributes', () => ({
  getPositionGroupAttribute: jest.fn()
}));

describe('getGroupedPositions', (): void => {
  let apple: DepotPosition;
  let pfizer: DepotPosition;
  let microsoft: DepotPosition;
  let positions: Positions;
  let securities: SecuritiesById;
  let groupBy: PositionGroupBy;
  let useBuyIn: boolean;
  let resolve: jest.Mock<(securitiesOfPosition: readonly SecurityRead[]) => string | null | undefined>;
  let getPositionGroupAttributeMock: jest.Mock<(id: PositionGroupBy) => PositionGroupAttribute | null>;

  function groupPositions(): GroupedPositions {
    return getGroupedPositions(positions, securities, groupBy, useBuyIn);
  }

  function groupNamed(result: GroupedPositions, name: string): PositionGroup {
    return result.groups.find((group: PositionGroup): boolean => group.name === name)!;
  }

  function groupsNamed(result: GroupedPositions, name: string): PositionGroup[] {
    return result.groups.filter((group: PositionGroup): boolean => group.name === name);
  }

  function namesOf(result: GroupedPositions): string[] {
    return result.groups.map((group: PositionGroup): string => group.name);
  }

  beforeEach((): void => {
    apple = depotPositionFactory({
      securityIds: [1],
      displayName: 'Apple Inc.',
      buyInAbsolute: 100,
      buyInRelative: 10,
      currentSizeAbsolute: 200,
      currentSizeRelative: 20
    });
    pfizer = depotPositionFactory({
      securityIds: [2],
      displayName: 'Pfizer Inc.',
      buyInAbsolute: 300,
      buyInRelative: 30,
      currentSizeAbsolute: 100,
      currentSizeRelative: 10
    });
    microsoft = depotPositionFactory({
      securityIds: [3],
      displayName: 'Microsoft Corp.',
      buyInAbsolute: 50,
      buyInRelative: 5,
      currentSizeAbsolute: 40,
      currentSizeRelative: 4
    });

    positions = {
      buyInAbsolute: apple.buyInAbsolute + pfizer.buyInAbsolute + microsoft.buyInAbsolute,
      currentSizeAbsolute: apple.currentSizeAbsolute + pfizer.currentSizeAbsolute + microsoft.currentSizeAbsolute,
      performanceAbsolute: apple.performanceAbsolute + pfizer.performanceAbsolute + microsoft.performanceAbsolute,
      performanceRelative: 0,
      positions: [
        apple,
        pfizer,
        microsoft
      ]
    };

    securities = {
      1: securityReadFactory({id: 1, sector: 'Technology'}),
      2: securityReadFactory({id: 2, sector: 'Health Care'}),
      3: securityReadFactory({id: 3, sector: 'Technology'})
    };

    resolve = jest.fn(
      (securitiesOfPosition: readonly SecurityRead[]): string | null | undefined => securitiesOfPosition[0]?.sector
    );
    getPositionGroupAttributeMock = getPositionGroupAttribute as jest.Mock<(id: PositionGroupBy) => PositionGroupAttribute | null>;
    getPositionGroupAttributeMock.mockReturnValue({
      id: 'sector',
      label: 'Sector',
      fallbackGroupName: 'Others',
      resolve
    });

    groupBy = 'sector';
    useBuyIn = false;
  });

  it('groups positions by resolved value, sums each group and flattens the positions in group order', (): void => {
    expect(groupPositions()).toEqual({
      positions: [
        apple,
        microsoft,
        pfizer
      ],
      groups: [
        {
          name: 'Technology',
          positions: [
            apple,
            microsoft
          ],
          buyInAbsolute: apple.buyInAbsolute + microsoft.buyInAbsolute,
          buyInRelative: apple.buyInRelative + microsoft.buyInRelative,
          currentSizeAbsolute: apple.currentSizeAbsolute + microsoft.currentSizeAbsolute,
          currentSizeRelative: apple.currentSizeRelative + microsoft.currentSizeRelative
        },
        {
          name: 'Health Care',
          positions: [pfizer],
          buyInAbsolute: pfizer.buyInAbsolute,
          buyInRelative: pfizer.buyInRelative,
          currentSizeAbsolute: pfizer.currentSizeAbsolute,
          currentSizeRelative: pfizer.currentSizeRelative
        }
      ]
    });
  });

  it('passes the positions through unchanged when groupBy is none', (): void => {
    groupBy = 'none';

    const result: GroupedPositions = groupPositions();

    expect(result.positions).toBe(positions.positions);
    expect(result.groups).toEqual([]);
  });

  it('passes the positions through unchanged when no attribute is registered for the id (defensive)', (): void => {
    getPositionGroupAttributeMock.mockReturnValue(null);

    const result: GroupedPositions = groupPositions();

    expect(result.positions).toBe(positions.positions);
    expect(result.groups).toEqual([]);
  });

  it('returns no groups and no positions for an empty position list', (): void => {
    positions = {...positions, positions: []};

    expect(groupPositions()).toEqual({positions: [], groups: []});
  });

  it('sorts groups by buy-in size descending when useBuyIn is true', (): void => {
    useBuyIn = true;

    expect(groupPositions()).toEqual({
      positions: [
        pfizer,
        apple,
        microsoft
      ],
      groups: [
        {
          name: 'Health Care',
          positions: [pfizer],
          buyInAbsolute: pfizer.buyInAbsolute,
          buyInRelative: pfizer.buyInRelative,
          currentSizeAbsolute: pfizer.currentSizeAbsolute,
          currentSizeRelative: pfizer.currentSizeRelative
        },
        {
          name: 'Technology',
          positions: [
            apple,
            microsoft
          ],
          buyInAbsolute: apple.buyInAbsolute + microsoft.buyInAbsolute,
          buyInRelative: apple.buyInRelative + microsoft.buyInRelative,
          currentSizeAbsolute: apple.currentSizeAbsolute + microsoft.currentSizeAbsolute,
          currentSizeRelative: apple.currentSizeRelative + microsoft.currentSizeRelative
        }
      ]
    });
  });

  it('keeps the first-seen group ahead of a later group of the same size', (): void => {
    positions = {
      ...positions,
      positions: [
        apple,
        {...pfizer, currentSizeAbsolute: apple.currentSizeAbsolute + microsoft.currentSizeAbsolute},
        microsoft
      ]
    };

    expect(namesOf(groupPositions())).toEqual([
      'Technology',
      'Health Care'
    ]);
  });

  it('hands resolve the loaded securities of a position in securityIds order, dropping the unloaded ones', (): void => {
    positions = {
      ...positions,
      positions: [depotPositionFactory({securityIds: [999, microsoft.securityIds[0], apple.securityIds[0]]})]
    };

    groupPositions();

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith([
      securities[microsoft.securityIds[0]],
      securities[apple.securityIds[0]]
    ]);
  });

  it('treats a security without a sector as no value and collects the position in the fallback group', (): void => {
    securities = {...securities, 1: securityReadFactory({id: 1})};

    const result: GroupedPositions = groupPositions();

    expect(namesOf(result)).toEqual([
      'Others',
      'Health Care',
      'Technology'
    ]);
    expect(groupNamed(result, 'Others').positions).toEqual([apple]);
  });

  it('treats a blank sector as no value and collects the position in the fallback group', (): void => {
    securities = {...securities, 1: securityReadFactory({id: 1, sector: '   '})};

    const result: GroupedPositions = groupPositions();

    expect(groupNamed(result, 'Others').positions).toEqual([apple]);
  });

  describe('with a position whose securities are all missing from the store', (): void => {
    beforeEach((): void => {
      securities = {
        1: securities[1],
        3: securities[3]
      };
    });

    it('hands resolve an empty array and collects the position in the fallback group', (): void => {
      const result: GroupedPositions = groupPositions();

      expect(resolve).toHaveBeenCalledTimes(positions.positions.length);
      expect(resolve).toHaveBeenCalledWith([]);
      expect(groupNamed(result, 'Others')).toEqual({
        name: 'Others',
        positions: [pfizer],
        buyInAbsolute: pfizer.buyInAbsolute,
        buyInRelative: pfizer.buyInRelative,
        currentSizeAbsolute: pfizer.currentSizeAbsolute,
        currentSizeRelative: pfizer.currentSizeRelative
      });
    });

    it('keeps a resolved group named like the fallback separate from the fallback group', (): void => {
      securities = {...securities, 3: securityReadFactory({id: 3, sector: 'Others'})};

      const result: GroupedPositions = groupPositions();

      expect(groupsNamed(result, 'Others').map((group: PositionGroup): DepotPosition[] => group.positions)).toEqual([
        [pfizer],
        [microsoft]
      ]);
    });

    describe('keeps a second position whose securities are missing as well', (): void => {
      beforeEach((): void => {
        securities = {1: securities[1]};
      });

      it('sums every position that ends up in the fallback group', (): void => {
        expect(groupNamed(groupPositions(), 'Others')).toEqual({
          name: 'Others',
          positions: [
            pfizer,
            microsoft
          ],
          buyInAbsolute: pfizer.buyInAbsolute + microsoft.buyInAbsolute,
          buyInRelative: pfizer.buyInRelative + microsoft.buyInRelative,
          currentSizeAbsolute: pfizer.currentSizeAbsolute + microsoft.currentSizeAbsolute,
          currentSizeRelative: pfizer.currentSizeRelative + microsoft.currentSizeRelative
        });
      });

      it('sorts the fallback group among the resolved ones by size', (): void => {
        const result: GroupedPositions = groupPositions();

        expect(namesOf(result)).toEqual([
          'Technology',
          'Others'
        ]);
        expect(result.positions).toEqual([
          apple,
          pfizer,
          microsoft
        ]);
      });
    });
  });
});
