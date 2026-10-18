import {describe, expect, it} from '@jest/globals';
import {padTimeWithSeconds} from './pad-time-with-seconds';

describe('padTimeWithSeconds', (): void => {
  it('appends :00 seconds to a time with no seconds', (): void => {
    expect(padTimeWithSeconds('14:30')).toBe('14:30:00');
  });

  it('leaves a time that already carries seconds unchanged', (): void => {
    expect(padTimeWithSeconds('14:30:05')).toBe('14:30:05');
  });

  it('leaves a string that does not match HH:mm unchanged', (): void => {
    expect(padTimeWithSeconds('not-a-time')).toBe('not-a-time');
  });
});
