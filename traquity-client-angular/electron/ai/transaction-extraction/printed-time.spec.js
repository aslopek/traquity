const {beforeEach, describe, expect, it} = require('@jest/globals');
const {maskTimesIn, timesIn} = require('./printed-time.js');

describe('timesIn', () => {
  /** @type {string} */
  let text;

  beforeEach(() => {
    text = 'Handelszeit  |  14:05:00';
  });

  it('reads a time stated to the second as itself', () => {
    expect(timesIn(text)).toEqual(['14:05:00']);
  });

  it('reads a time stated to the minute as the whole minute', () => {
    text = 'Handelszeit  |  : 20:56 Uhr (MEZ/MESZ)';

    expect(timesIn(text)).toEqual(['20:56:00']);
  });

  it('drops the fraction of a second a fourth group states', () => {
    text = 'Auftragszeit:  |  17:28:46:73';

    expect(timesIn(text)).toEqual(['17:28:46']);
  });

  it('drops a fraction of three digits the same way', () => {
    text = '11:57:34:007';

    expect(timesIn(text)).toEqual(['11:57:34']);
  });

  it('pads an hour the page prints with one digit', () => {
    text = '9:05';

    expect(timesIn(text)).toEqual(['09:05:00']);
  });

  it('reads midnight', () => {
    text = '00:00:00';

    expect(timesIn(text)).toEqual(['00:00:00']);
  });

  it('reads the last second of the day', () => {
    text = '23:59:59';

    expect(timesIn(text)).toEqual(['23:59:59']);
  });

  it('refuses an hour past the end of the day', () => {
    text = '24:00:00';

    expect(timesIn(text)).toEqual([]);
  });

  it('refuses a minute past the end of the hour', () => {
    text = '12:60';

    expect(timesIn(text)).toEqual([]);
  });

  it('refuses a second past the end of the minute', () => {
    text = '12:30:60';

    expect(timesIn(text)).toEqual([]);
  });

  it('passes over a word carrying more groups than a time has', () => {
    text = '1:2:3:4:5';

    expect(timesIn(text)).toEqual([]);
  });

  it('passes over a word carrying only one group', () => {
    text = '1430';

    expect(timesIn(text)).toEqual([]);
  });

  it('passes over a longer run of digits and colons', () => {
    text = 'Referenz 12:34:56:78:90';

    expect(timesIn(text)).toEqual([]);
  });

  it('reads an afternoon hour a 12-hour clock states', () => {
    text = 'Executed  |  4:37 pm';

    expect(timesIn(text)).toEqual(['16:37:00']);
  });

  it('reads a morning hour a 12-hour clock states as itself', () => {
    text = 'Executed  |  9:05 am';

    expect(timesIn(text)).toEqual(['09:05:00']);
  });

  it('reads the noon hour a 12-hour clock states', () => {
    text = 'Executed  |  12:30 pm';

    expect(timesIn(text)).toEqual(['12:30:00']);
  });

  it('reads the midnight hour a 12-hour clock states', () => {
    text = 'Executed  |  12:30 am';

    expect(timesIn(text)).toEqual(['00:30:00']);
  });

  it('reads a meridiem the page prints in capitals', () => {
    text = 'Executed  |  4:37 PM';

    expect(timesIn(text)).toEqual(['16:37:00']);
  });

  it('reads a meridiem the page prints in mixed case', () => {
    text = 'Executed  |  4:37 Pm';

    expect(timesIn(text)).toEqual(['16:37:00']);
  });

  it('reads a meridiem the page prints in capitals with dots', () => {
    text = 'Executed  |  9:05 A.M.';

    expect(timesIn(text)).toEqual(['09:05:00']);
  });

  it('reads a meridiem the page prints with dots', () => {
    text = 'Executed  |  4:37 p.m.';

    expect(timesIn(text)).toEqual(['16:37:00']);
  });

  it('reads a meridiem the page prints against the clock face', () => {
    text = 'Executed  |  4:37pm';

    expect(timesIn(text)).toEqual(['16:37:00']);
  });

  it('reads the second of a 12-hour clock stating one', () => {
    text = 'Executed  |  4:37:12 pm';

    expect(timesIn(text)).toEqual(['16:37:12']);
  });

  it('refuses an hour no 12-hour clock shows', () => {
    text = 'Executed  |  13:37 pm';

    expect(timesIn(text)).toEqual([]);
  });

  it('refuses the zero hour on a 12-hour clock', () => {
    text = 'Executed  |  0:37 am';

    expect(timesIn(text)).toEqual([]);
  });

  it('passes over a word whose meridiem opens a longer one', () => {
    text = 'Executed  |  4:37 pmx';

    expect(timesIn(text)).toEqual(['04:37:00']);
  });

  it('reads every time a row states', () => {
    text = 'Ortszeit  |  27.04.2026 12:14:36  |  Schlusstag/-Zeit 27.04.2026 17:14:36';

    expect(timesIn(text)).toEqual(['12:14:36', '17:14:36']);
  });

  it('states a time the page prints twice once', () => {
    text = 'Ortszeit  |  17:14:36  |  Schlusstag/-Zeit  |  17:14:36';

    expect(timesIn(text)).toEqual(['17:14:36']);
  });
});

describe('maskTimesIn', () => {
  /** @type {string} */
  let text;

  beforeEach(() => {
    text = 'um 14:05:00 gehandelt';
  });

  it('replaces a time with as many spaces', () => {
    expect(maskTimesIn(text)).toBe('um          gehandelt');
  });

  it('replaces every time a row states', () => {
    text = 'von 12:14:36 bis 17:14:36 gehandelt';

    expect(maskTimesIn(text)).toBe('von          bis          gehandelt');
  });

  it('replaces a time and the meridiem behind it with as many spaces', () => {
    text = 'at 4:37 pm sold';

    expect(maskTimesIn(text)).toBe('at         sold');
  });

  it('leaves a longer run of digits and colons untouched', () => {
    text = 'Referenz 12:34:56:78:90';

    expect(maskTimesIn(text)).toBe('Referenz 12:34:56:78:90');
  });

  it('leaves a text stating no time untouched', () => {
    text = 'Kurswert  |  1.005,00 EUR';

    expect(maskTimesIn(text)).toBe('Kurswert  |  1.005,00 EUR');
  });
});
