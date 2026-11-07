type DataSourceUrls = {
  urlPattern?: string
  urlPatterns?: { urlPattern: string }[]
};

export function isIsinKeyed(dataSource: DataSourceUrls | undefined): boolean {
  const urls: string[] = dataSource?.urlPatterns?.map(({urlPattern}: { urlPattern: string }): string => urlPattern)
    ?? [dataSource?.urlPattern ?? ''];
  return urls.some((url: string): boolean => url.includes('#id(isin)'));
}
