import {AnyDataSource, MultiUrlDataSource, RequestHeader, SingleUrlDataSource, UrlPattern} from '../data-source.type';

/**
 * Matches `#mask(...)` with an argument that may contain one level of nested parentheses. The alternation consumes a single character per
 * iteration, so every input has exactly one parse and no backtracking is possible.
 */
const MASKED_VALUE_PATTERN: RegExp = /#mask\(((?:[^()]|\([^()]*\))*)\)/;

export function extractMaskedValue(urlPattern: string): string | null {
  const match: RegExpMatchArray | null = urlPattern.match(MASKED_VALUE_PATTERN);
  return match ? match[1] : null;
}

export function replaceMaskedValue(urlPattern: string, newValue: string): string {
  return urlPattern.replace(MASKED_VALUE_PATTERN, `#mask(${newValue})`);
}

/**
 * @param values strings that may each carry a masked value
 * @returns the argument of the first masked value found, or `null` when none of the strings carries one
 */
export function findMaskedValue(values: string[]): string | null {
  for (const value of values) {
    const maskedValue: string | null = extractMaskedValue(value);
    if (maskedValue !== null) {
      return maskedValue;
    }
  }
  return null;
}

/**
 * @param dataSource a data source of either kind
 * @returns every string of that data source a masked value may sit in - its URL pattern or patterns, followed by its request header values
 */
export function maskedValueCarriers(dataSource: AnyDataSource): string[] {
  const urls: string[] = dataSource.urlPatterns != null
    ? dataSource.urlPatterns.map((pattern: UrlPattern): string => pattern.urlPattern)
    : [dataSource.urlPattern];
  return [...urls, ...dataSource.requestHeaders.map((header: RequestHeader): string => header.headerValue)];
}

/**
 * @param dataSource a data source of either kind
 * @param newValue the argument every masked value is to carry
 * @returns a copy of the data source whose masked values all carry `newValue`; strings carrying no masked value are kept verbatim
 */
export function withMaskedValue(dataSource: MultiUrlDataSource, newValue: string): MultiUrlDataSource;
export function withMaskedValue(dataSource: SingleUrlDataSource, newValue: string): SingleUrlDataSource;

export function withMaskedValue(dataSource: AnyDataSource, newValue: string): AnyDataSource {
  const requestHeaders: RequestHeader[] = dataSource.requestHeaders.map((header: RequestHeader): RequestHeader => {
    return {...header, headerValue: replaceMaskedValue(header.headerValue, newValue)};
  });

  if (dataSource.urlPatterns != null) {
    const urlPatterns: UrlPattern[] = dataSource.urlPatterns.map((pattern: UrlPattern): UrlPattern => {
      return {...pattern, urlPattern: replaceMaskedValue(pattern.urlPattern, newValue)};
    });
    return {...dataSource, requestHeaders, urlPatterns};
  }

  return {...dataSource, requestHeaders, urlPattern: replaceMaskedValue(dataSource.urlPattern, newValue)};
}
