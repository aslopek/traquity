import {SecurityRead} from '../../../gen/api/security';
import {SecurityState} from '../security.state';

export function getSecurityIdsMatchingNameSelector(state: Pick<SecurityState, 'securities'>,
                                                   filterText: string): number[] {
  const searchFor: string = filterText.trim().toLowerCase();
  return Object.values(state.securities)
    .filter((security: SecurityRead): boolean => security.name.toLowerCase().includes(searchFor))
    .sort((a: SecurityRead, b: SecurityRead): number => a.name.localeCompare(b.name) || a.id - b.id)
    .map((security: SecurityRead): number => security.id);
}
