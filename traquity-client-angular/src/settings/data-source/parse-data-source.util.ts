import {dividendAnnouncementDataSourceSchema, historicalSecurityPriceDataSourceSchema} from './data-source.schema';
import {DataSourceVariant, MultiUrlDataSource, SingleUrlDataSource} from './data-source.type';

export type ParsedDataSource =
  | { variant: 'historical-security-price', dataSource: MultiUrlDataSource }
  | { variant: 'dividend-announcement', dataSource: SingleUrlDataSource };

/**
 * Validates the content of a data source configuration file against the schema of the given variant and tags the
 * result with that variant, so what came out of the file stays distinguishable by type.
 *
 * Content that is no JSON at all and JSON the schema rejects both yield `null`: a file either describes a data source
 * of the requested variant or it does not.
 */
export function parseDataSource(variant: DataSourceVariant, fileContent: string): ParsedDataSource | null {
  let json: unknown;
  try {
    json = JSON.parse(fileContent);
  } catch {
    return null;
  }

  if (variant === 'historical-security-price') {
    const dataSource: MultiUrlDataSource | undefined = historicalSecurityPriceDataSourceSchema.safeParse(json).data;
    return dataSource === undefined ? null : {variant, dataSource};
  }

  const dataSource: SingleUrlDataSource | undefined = dividendAnnouncementDataSourceSchema.safeParse(json).data;
  return dataSource === undefined ? null : {variant, dataSource};
}
