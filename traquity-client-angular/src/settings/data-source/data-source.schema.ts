import {z} from 'zod';

/**
 * The schemas for a data source configuration file, mirroring `HistoricalSecurityPriceDataSourceCreate` of
 * `historical-security-price.yaml` and `DividendAnnouncementDataSourceCreate` of
 * `notification-dividend-announcement.yaml`. Such a file arrives from outside the program, so it is defined exactly
 * once here and every static type is inferred from these very schemas.
 *
 * Every object is strict: a key the API does not declare is a mistake in the file rather than something to drop
 * silently. `id` and `version` are the one exception - a file describing a data source that already exists carries
 * them, and both are accepted and then stripped, since neither is part of what a configuration file defines.
 */

const currencySchema = z.string().regex(/^[A-Z]{3}$/);

const nameSchema = z.string().min(1).max(255);

export const currencyMappingSchema = z.strictObject({
  currencyKey: z.string().max(255),
  mappedCurrencyCode: currencySchema,
  multiplier: z.number().optional()
});

export const requestHeaderSchema = z.strictObject({
  headerName: z.string().min(1).max(255),
  headerValue: z.string()
});

export const dateConfigurationSchema = z.strictObject({
  format: z.enum(['TIMESTAMP_SECONDS', 'TIMESTAMP_MILLISECONDS', 'CUSTOM_STRING']),
  customPattern: z.string().min(1).max(255).optional()
});

export const urlPatternSchema = z.strictObject({
  timespanInDays: z.int().min(1),
  urlPattern: z.string().min(1)
});

export const zonedTimeSchema = z.strictObject({
  time: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  timeZone: z.string().min(1).max(255)
});

const dataSourceShape = {
  name: nameSchema,
  requestHeaders: z.array(requestHeaderSchema),
  jsonPathDate: z.string().min(1),
  dateFormat: dateConfigurationSchema,
  jsonPathValue: z.string().min(1),
  jsonPathCurrency: z.string().min(1).optional(),
  regexCurrency: z.string().min(1).optional(),
  regexCurrencyGroup: z.int().min(0).optional(),
  currencyMappings: z.array(currencyMappingSchema)
} as const;

const storedDataSourceShape = {
  id: z.int().min(1).optional(),
  version: z.int().min(0).optional()
} as const;

export const historicalSecurityPriceDataSourceSchema = z.strictObject({
  ...dataSourceShape,
  ...storedDataSourceShape,
  urlPatterns: z.array(urlPatternSchema).min(1),
  // the API requires the array, so an absent one is read as 'this data source declares no market close time' rather
  // than as a reason to reject the file
  marketCloseTimes: z.array(zonedTimeSchema).default([])
}).transform(({id, version, ...dataSource}) => dataSource);

export const dividendAnnouncementDataSourceSchema = z.strictObject({
  ...dataSourceShape,
  ...storedDataSourceShape,
  urlPattern: z.string().min(1)
}).transform(({id, version, ...dataSource}) => dataSource);
