import {beforeEach, describe, expect, it} from '@jest/globals';
import {parseDataSource} from './parse-data-source.util';
import {MultiUrlDataSource, SingleUrlDataSource} from './data-source.type';

describe('parseDataSource', () => {

  describe('historical security price', () => {

    let file: Record<string, unknown>;

    beforeEach((): void => {
      file = {
        name: 'Some Price Provider',
        urlPatterns: [{timespanInDays: 30, urlPattern: 'https://stock.api/#id()/prices'}],
        requestHeaders: [{headerName: 'X-API-Key', headerValue: '#mask(someSecretApiKey)'}],
        jsonPathDate: '$.prices[*].date',
        dateFormat: {format: 'CUSTOM_STRING', customPattern: 'yyyy-MM-dd'},
        jsonPathValue: '$.prices[*].close',
        jsonPathCurrency: '$.currency',
        regexCurrency: '^.',
        regexCurrencyGroup: 1,
        currencyMappings: [{currencyKey: 'GBp', mappedCurrencyCode: 'GBP', multiplier: 0.01}],
        marketCloseTimes: [{time: '17:30:00', timeZone: 'America/New_York'}]
      } satisfies MultiUrlDataSource;
    });

    it('returns the data source a matching file describes', (): void => {
      expect(parseDataSource('historical-security-price', JSON.stringify(file)))
        .toEqual({variant: 'historical-security-price', dataSource: file});
    });

    it('reads absent market close times as none', (): void => {
      const expectedDataSource: Record<string, unknown> = {...file, marketCloseTimes: []};
      delete file['marketCloseTimes'];

      expect(parseDataSource('historical-security-price', JSON.stringify(file)))
        .toEqual({variant: 'historical-security-price', dataSource: expectedDataSource});
    });

    it('drops the id of a data source that exists already', (): void => {
      const expectedDataSource: Record<string, unknown> = {...file};
      file['id'] = 7;

      expect(parseDataSource('historical-security-price', JSON.stringify(file)))
        .toEqual({variant: 'historical-security-price', dataSource: expectedDataSource});
    });

    it('drops the version of a data source that exists already', (): void => {
      const expectedDataSource: Record<string, unknown> = {...file};
      file['version'] = 3;

      expect(parseDataSource('historical-security-price', JSON.stringify(file)))
        .toEqual({variant: 'historical-security-price', dataSource: expectedDataSource});
    });

    it('rejects a file without a single url pattern', (): void => {
      file['urlPatterns'] = [];

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a url pattern covering less than one day', (): void => {
      file['urlPatterns'] = [{timespanInDays: 0, urlPattern: 'https://stock.api/#id()/prices'}];

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a url pattern covering a fraction of a day', (): void => {
      file['urlPatterns'] = [{timespanInDays: 1.5, urlPattern: 'https://stock.api/#id()/prices'}];

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a file carrying the single url pattern of the other variant', (): void => {
      file['urlPattern'] = 'https://stock.api/#id()/prices';

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a file carrying a key the API does not declare', (): void => {
      file['unrelatedKey'] = 1;

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects an empty name', (): void => {
      file['name'] = '';

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a file without a json path to the value', (): void => {
      delete file['jsonPathValue'];

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a date format outside the three the API knows', (): void => {
      file['dateFormat'] = {format: 'TIMESTAMP_NANOSECONDS'};

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a currency mapping onto something that is no ISO currency code', (): void => {
      file['currencyMappings'] = [{currencyKey: 'GBp', mappedCurrencyCode: 'Pound'}];

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a market close time that is no time of day', (): void => {
      file['marketCloseTimes'] = [{time: '24:30:00', timeZone: 'America/New_York'}];

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects a market close time without a time zone', (): void => {
      file['marketCloseTimes'] = [{time: '17:30:00'}];

      expect(parseDataSource('historical-security-price', JSON.stringify(file))).toBeNull();
    });

    it('rejects content that is no JSON', (): void => {
      expect(parseDataSource('historical-security-price', '{"name": "Some Price Provider"')).toBeNull();
    });
  });

  describe('dividend announcement', () => {

    let file: Record<string, unknown>;

    beforeEach((): void => {
      file = {
        name: 'Some Dividend Provider',
        urlPattern: 'https://dividend.api/#id()/dividends',
        requestHeaders: [{headerName: 'X-API-Key', headerValue: '#mask(someSecretApiKey)'}],
        jsonPathDate: '$.payments[*].date',
        dateFormat: {format: 'TIMESTAMP_SECONDS'},
        jsonPathValue: '$.payments[*].dividendPayment',
        currencyMappings: [{currencyKey: '', mappedCurrencyCode: 'USD'}]
      } satisfies SingleUrlDataSource;
    });

    it('returns the data source a matching file describes', (): void => {
      expect(parseDataSource('dividend-announcement', JSON.stringify(file)))
        .toEqual({variant: 'dividend-announcement', dataSource: file});
    });

    it('rejects an empty url pattern', (): void => {
      file['urlPattern'] = '';

      expect(parseDataSource('dividend-announcement', JSON.stringify(file))).toBeNull();
    });

    it('rejects a file carrying the url patterns of the other variant', (): void => {
      file['urlPatterns'] = [{timespanInDays: 30, urlPattern: 'https://dividend.api/#id()/dividends'}];

      expect(parseDataSource('dividend-announcement', JSON.stringify(file))).toBeNull();
    });

    it('rejects market close times, which this variant has none of', (): void => {
      file['marketCloseTimes'] = [{time: '17:30:00', timeZone: 'America/New_York'}];

      expect(parseDataSource('dividend-announcement', JSON.stringify(file))).toBeNull();
    });

    it('rejects a file without request headers', (): void => {
      delete file['requestHeaders'];

      expect(parseDataSource('dividend-announcement', JSON.stringify(file))).toBeNull();
    });

    it('rejects a request header without a name', (): void => {
      file['requestHeaders'] = [{headerValue: '#mask(someSecretApiKey)'}];

      expect(parseDataSource('dividend-announcement', JSON.stringify(file))).toBeNull();
    });

    it('rejects a date format given as a plain string', (): void => {
      file['dateFormat'] = 'TIMESTAMP_SECONDS';

      expect(parseDataSource('dividend-announcement', JSON.stringify(file))).toBeNull();
    });

    it('rejects a currency mapping without a mapped currency code', (): void => {
      file['currencyMappings'] = [{currencyKey: 'GBp'}];

      expect(parseDataSource('dividend-announcement', JSON.stringify(file))).toBeNull();
    });

    it('rejects content that is no JSON', (): void => {
      expect(parseDataSource('dividend-announcement', '{"name": "Some Dividend Provider"')).toBeNull();
    });
  });
});
