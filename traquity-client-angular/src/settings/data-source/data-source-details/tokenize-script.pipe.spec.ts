import {beforeEach, describe, expect, it} from '@jest/globals';
import {ScriptTokenizerPipe, TextToken} from './tokenize-script.pipe';

describe('ScriptTokenizerPipe', (): void => {

  let pipe: ScriptTokenizerPipe;
  let value: string;

  beforeEach((): void => {
    pipe = new ScriptTokenizerPipe();
    value = 'https://stock.api/#id()/prices';
  });

  it('splits the text into its plain and script parts', (): void => {
    expect(pipe.transform(value)).toEqual([
      {text: 'https://stock.api/', isScript: false},
      {text: '#id()', isScript: true},
      {text: '/prices', isScript: false}
    ] satisfies TextToken[]);
  });

  it('returns no tokens for an absent value', (): void => {
    expect(pipe.transform(null)).toEqual([]);
  });

  it('returns text without a script as a single plain token', (): void => {
    value = 'https://stock.api/prices';

    expect(pipe.transform(value)).toEqual([{text: 'https://stock.api/prices', isScript: false}] satisfies TextToken[]);
  });

  it('marks a script taking arguments as a script', (): void => {
    value = '?from=#date(yyyy-MM-dd,30)';

    expect(pipe.transform(value)).toEqual([
      {text: '?from=', isScript: false},
      {text: '#date(yyyy-MM-dd,30)', isScript: true},
      {text: '', isScript: false}
    ] satisfies TextToken[]);
  });

  it('marks a script whose argument holds a parenthesized group as a script', (): void => {
    value = '?key=#mask(#base64(secret))';

    expect(pipe.transform(value)).toEqual([
      {text: '?key=', isScript: false},
      {text: '#mask(#base64(secret))', isScript: true},
      {text: '', isScript: false}
    ] satisfies TextToken[]);
  });

  it('marks each of several scripts in one value as a script', (): void => {
    value = '?from=#date(yyyy-MM-dd,30)&key=#mask(#base64(super:secret))';

    expect(pipe.transform(value)).toEqual([
      {text: '?from=', isScript: false},
      {text: '#date(yyyy-MM-dd,30)', isScript: true},
      {text: '&key=', isScript: false},
      {text: '#mask(#base64(super:secret))', isScript: true},
      {text: '', isScript: false}
    ] satisfies TextToken[]);
  });

  // the argument is long enough that a pattern backtracking exponentially over it would not finish, so this also guards the linear parse
  it('keeps an unterminated script as plain text', (): void => {
    value = `?key=#mask(${'\''.repeat(40)}`;

    expect(pipe.transform(value)).toEqual([{text: value, isScript: false}] satisfies TextToken[]);
  });
});
