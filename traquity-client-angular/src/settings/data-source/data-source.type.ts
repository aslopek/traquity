import {z} from 'zod';
import {
  currencyMappingSchema,
  dateConfigurationSchema,
  dividendAnnouncementDataSourceSchema,
  historicalSecurityPriceDataSourceSchema,
  requestHeaderSchema,
  urlPatternSchema,
  zonedTimeSchema
} from './data-source.schema';

export type DataSourceVariant = 'historical-security-price' | 'dividend-announcement';

export type CurrencyMapping = z.infer<typeof currencyMappingSchema>;

export type DateConfiguration = z.infer<typeof dateConfigurationSchema>;

export type RequestHeader = z.infer<typeof requestHeaderSchema>;

export type UrlPattern = z.infer<typeof urlPatternSchema>;

export type ZonedTime = z.infer<typeof zonedTimeSchema>;

// the `never` members carry the other variant's discriminating keys, so a value of the union below can be asked for
// either of them
export type SingleUrlDataSource = z.infer<typeof dividendAnnouncementDataSourceSchema> & {
  urlPatterns?: never
  marketCloseTimes?: never
};

export type MultiUrlDataSource = z.infer<typeof historicalSecurityPriceDataSourceSchema> & {
  urlPattern?: never
};

export type AnyDataSource = SingleUrlDataSource | MultiUrlDataSource;

export type DataSourceWithId = AnyDataSource & {
  id: number
  version: number
};
