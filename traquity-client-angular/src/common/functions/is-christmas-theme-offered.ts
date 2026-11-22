import {isChristmasSeason} from './is-christmas-season';

/**
 * @param date the date to check
 * @param devModeActive whether dev mode is active
 * @returns true in the Christmas season or while dev mode is active, false otherwise
 */
export function isChristmasThemeOffered(date: Date, devModeActive: boolean): boolean {
  return devModeActive || isChristmasSeason(date);
}
