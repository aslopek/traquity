import {describe, expect, it} from '@jest/globals';
import {weekStartOf, workdayColumnOf} from './pay-date-week';

describe('weekStartOf', () => {
  it('returns the same day for a Monday', () => {
    expect(weekStartOf('2024-01-08')).toBe('2024-01-08');
  });

  it('returns the Monday before for a Friday', () => {
    expect(weekStartOf('2024-01-12')).toBe('2024-01-08');
  });

  it('returns the Monday before for a Sunday', () => {
    expect(weekStartOf('2024-01-14')).toBe('2024-01-08');
  });

  it('returns the Monday of the previous year for a week spanning the turn of the year', () => {
    expect(weekStartOf('2025-01-01')).toBe('2024-12-30');
  });
});

describe('workdayColumnOf', () => {
  it('returns 0 for a Monday', () => {
    expect(workdayColumnOf('2024-01-08')).toBe(0);
  });

  it('returns 1 for a Tuesday', () => {
    expect(workdayColumnOf('2024-01-09')).toBe(1);
  });

  it('returns 4 for a Friday', () => {
    expect(workdayColumnOf('2024-01-12')).toBe(4);
  });

  it('returns 4 for a Saturday', () => {
    expect(workdayColumnOf('2024-01-13')).toBe(4);
  });

  it('returns 4 for a Sunday', () => {
    expect(workdayColumnOf('2024-01-14')).toBe(4);
  });
});
