import {beforeEach, describe, expect, it} from '@jest/globals';
import {MultiUrlDataSource, SingleUrlDataSource} from '../data-source.type';
import {
  extractMaskedValue,
  findMaskedValue,
  maskedValueCarriers,
  replaceMaskedValue,
  withMaskedValue
} from './mask-value.util';

function multiUrlDataSource(): MultiUrlDataSource {
  return {
    name: 'Prices',
    urlPatterns: [
      {timespanInDays: 30, urlPattern: 'https://stock.api/#id()/prices?range=30d&key=#mask(someSecretApiKey)'},
      {timespanInDays: 365, urlPattern: 'https://stock.api/#id()/prices?range=1y&key=#mask(someSecretApiKey)'}
    ],
    requestHeaders: [{headerName: 'X-Api-Key', headerValue: '#mask(someSecretApiKey)'}],
    jsonPathDate: '$.quotes[*].date',
    dateFormat: {format: 'CUSTOM_STRING', customPattern: 'yyyy-MM-dd'},
    jsonPathValue: '$.quotes[*].price',
    jsonPathCurrency: '$.currency',
    currencyMappings: [],
    marketCloseTimes: []
  };
}

function singleUrlDataSource(): SingleUrlDataSource {
  return {
    name: 'Dividends',
    urlPattern: 'https://dividend.api/#id()/dividends',
    requestHeaders: [{headerName: 'X-Api-Key', headerValue: '#mask(someSecretApiKey)'}],
    jsonPathDate: '$.dividends[*].payDate',
    dateFormat: {format: 'CUSTOM_STRING', customPattern: 'yyyy-MM-dd'},
    jsonPathValue: '$.dividends[*].amount',
    jsonPathCurrency: '$.dividends[*].currency',
    currencyMappings: []
  };
}

describe('extractMaskedValue', (): void => {

  let urlPattern: string;

  beforeEach((): void => {
    urlPattern = 'https://stock.api/#id()/prices?key=#mask(someSecretApiKey)';
  });

  it('returns the argument of the masked value', (): void => {
    expect(extractMaskedValue(urlPattern)).toBe('someSecretApiKey');
  });

  it('returns null when no value is masked', (): void => {
    urlPattern = 'https://stock.api/#id()/prices';

    expect(extractMaskedValue(urlPattern)).toBeNull();
  });

  it('returns the empty argument of an empty masked value', (): void => {
    urlPattern = 'https://stock.api/prices?key=#mask()';

    expect(extractMaskedValue(urlPattern)).toBe('');
  });

  it('returns an argument containing a parenthesized group', (): void => {
    urlPattern = 'https://stock.api/prices?key=#mask(#base64(secret))';

    expect(extractMaskedValue(urlPattern)).toBe('#base64(secret)');
  });

  it('returns the argument of the first masked value', (): void => {
    urlPattern = 'https://stock.api/prices?key=#mask(first)&other=#mask(second)';

    expect(extractMaskedValue(urlPattern)).toBe('first');
  });

  // the argument is long enough that a pattern backtracking exponentially over it would not finish, so this also guards the linear parse
  it('returns null for an unterminated masked value', (): void => {
    urlPattern = `https://stock.api/prices?key=#mask(${'\''.repeat(40)}`;

    expect(extractMaskedValue(urlPattern)).toBeNull();
  });
});

describe('replaceMaskedValue', (): void => {

  let urlPattern: string;

  beforeEach((): void => {
    urlPattern = 'https://stock.api/#id()/prices?key=#mask(someSecretApiKey)';
  });

  it('replaces the argument of the masked value', (): void => {
    expect(replaceMaskedValue(urlPattern, 'newKey')).toBe('https://stock.api/#id()/prices?key=#mask(newKey)');
  });

  it('returns the pattern unchanged when no value is masked', (): void => {
    urlPattern = 'https://stock.api/#id()/prices';

    expect(replaceMaskedValue(urlPattern, 'newKey')).toBe('https://stock.api/#id()/prices');
  });

  it('replaces only the first masked value', (): void => {
    urlPattern = 'https://stock.api/prices?key=#mask(first)&other=#mask(second)';

    expect(replaceMaskedValue(urlPattern, 'newKey')).toBe('https://stock.api/prices?key=#mask(newKey)&other=#mask(second)');
  });
});

describe('findMaskedValue', (): void => {
  let values: string[];

  beforeEach((): void => {
    values = [
      'https://stock.api/#id()/prices',
      'https://stock.api/#id()/prices?key=#mask(someSecretApiKey)'
    ];
  });

  it('returns the masked value of the first string carrying one', (): void => {
    expect(findMaskedValue(values)).toBe('someSecretApiKey');
  });

  it('returns null when no string carries a masked value', (): void => {
    values = ['https://stock.api/#id()/prices'];

    expect(findMaskedValue(values)).toBeNull();
  });

  it('returns null for no strings at all', (): void => {
    values = [];

    expect(findMaskedValue(values)).toBeNull();
  });
});

describe('maskedValueCarriers', (): void => {
  describe('of a data source with several url patterns', (): void => {
    let dataSource: MultiUrlDataSource;

    beforeEach((): void => {
      dataSource = multiUrlDataSource();
    });

    it('returns every url pattern followed by every request header value', (): void => {
      expect(maskedValueCarriers(dataSource)).toEqual([
        'https://stock.api/#id()/prices?range=30d&key=#mask(someSecretApiKey)',
        'https://stock.api/#id()/prices?range=1y&key=#mask(someSecretApiKey)',
        '#mask(someSecretApiKey)'
      ]);
    });

    it('returns only the request header values for a data source without url patterns', (): void => {
      dataSource.urlPatterns = [];

      expect(maskedValueCarriers(dataSource)).toEqual(['#mask(someSecretApiKey)']);
    });

    it('returns only the url patterns for a data source without request headers', (): void => {
      dataSource.requestHeaders = [];

      expect(maskedValueCarriers(dataSource)).toEqual([
        'https://stock.api/#id()/prices?range=30d&key=#mask(someSecretApiKey)',
        'https://stock.api/#id()/prices?range=1y&key=#mask(someSecretApiKey)'
      ]);
    });
  });

  describe('of a data source with a single url pattern', (): void => {
    let dataSource: SingleUrlDataSource;

    beforeEach((): void => {
      dataSource = singleUrlDataSource();
    });

    it('returns the url pattern followed by every request header value', (): void => {
      expect(maskedValueCarriers(dataSource)).toEqual([
        'https://dividend.api/#id()/dividends',
        '#mask(someSecretApiKey)'
      ]);
    });

    it('returns only the url pattern for a data source without request headers', (): void => {
      dataSource.requestHeaders = [];

      expect(maskedValueCarriers(dataSource)).toEqual(['https://dividend.api/#id()/dividends']);
    });
  });
});

describe('withMaskedValue', (): void => {
  describe('for a data source with several url patterns', (): void => {
    let dataSource: MultiUrlDataSource;

    beforeEach((): void => {
      dataSource = multiUrlDataSource();
    });

    it('carries the new value in every url pattern and request header', (): void => {
      expect(withMaskedValue(dataSource, 'newKey')).toEqual({
        ...multiUrlDataSource(),
        urlPatterns: [
          {timespanInDays: 30, urlPattern: 'https://stock.api/#id()/prices?range=30d&key=#mask(newKey)'},
          {timespanInDays: 365, urlPattern: 'https://stock.api/#id()/prices?range=1y&key=#mask(newKey)'}
        ],
        requestHeaders: [{headerName: 'X-Api-Key', headerValue: '#mask(newKey)'}]
      });
    });

    it('keeps a url pattern carrying no masked value verbatim', (): void => {
      dataSource.urlPatterns = [{timespanInDays: 999999, urlPattern: 'https://stock.api/#id()/prices'}];

      expect(withMaskedValue(dataSource, 'newKey').urlPatterns).toEqual([
        {timespanInDays: 999999, urlPattern: 'https://stock.api/#id()/prices'}
      ]);
    });

    it('keeps a request header carrying no masked value verbatim', (): void => {
      dataSource.requestHeaders = [{headerName: 'Accept', headerValue: 'application/json'}];

      expect(withMaskedValue(dataSource, 'newKey').requestHeaders).toEqual([
        {headerName: 'Accept', headerValue: 'application/json'}
      ]);
    });

    it('leaves the data source it was given untouched', (): void => {
      withMaskedValue(dataSource, 'newKey');

      expect(dataSource).toEqual(multiUrlDataSource());
    });
  });

  describe('for a data source with a single url pattern', (): void => {
    let dataSource: SingleUrlDataSource;

    beforeEach((): void => {
      dataSource = singleUrlDataSource();
    });

    it('carries the new value in the request header', (): void => {
      expect(withMaskedValue(dataSource, 'newKey')).toEqual({
        ...singleUrlDataSource(),
        requestHeaders: [{headerName: 'X-Api-Key', headerValue: '#mask(newKey)'}]
      });
    });

    it('carries the new value in the url pattern', (): void => {
      dataSource.urlPattern = 'https://dividend.api/#id()/dividends?key=#mask(someSecretApiKey)';

      expect(withMaskedValue(dataSource, 'newKey').urlPattern).toBe('https://dividend.api/#id()/dividends?key=#mask(newKey)');
    });

    it('leaves the data source it was given untouched', (): void => {
      withMaskedValue(dataSource, 'newKey');

      expect(dataSource).toEqual(singleUrlDataSource());
    });
  });
});
