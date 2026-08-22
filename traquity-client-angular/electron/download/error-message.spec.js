const {describe, expect, it} = require('@jest/globals');
const {messageOf} = require('./error-message.js');

describe('messageOf', () => {
  it('returns the message of a plain error', () => {
    expect(messageOf(new Error('failed'))).toBe('failed');
  });

  it('appends the message of a chained cause', () => {
    expect(messageOf(new TypeError('fetch failed', {cause: new Error('getaddrinfo ENOTFOUND example.com')})))
      .toBe('fetch failed: getaddrinfo ENOTFOUND example.com');
  });

  it('follows a cause chain several levels deep', () => {
    const error = new Error('outer', {cause: new Error('middle', {cause: new Error('inner')})});

    expect(messageOf(error)).toBe('outer: middle: inner');
  });

  it('stops following the chain at its maximum depth rather than looping forever on a cyclic cause', () => {
    const cyclic = new Error('cyclic');
    cyclic.cause = cyclic;

    expect(messageOf(cyclic)).toBe(Array.from({length: 5}, () => 'cyclic').join(': '));
  });

  it('stringifies a thrown value that is not an Error', () => {
    expect(messageOf('a plain string')).toBe('a plain string');
  });
});
