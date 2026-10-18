import {createActionGroup, emptyProps, props} from '@ngrx/store';
import {SecurityCreate, SecurityRead, SecurityUpdate} from '../../gen/api/security';
import {
  HistoricalSecurityPriceConfigCreate,
  HistoricalSecurityPriceConfigRead,
  HistoricalSecurityPriceDataSourceRead
} from '../../gen/api/historical-security-price';
import {DividendAnnouncementConfigCreate} from '../../gen/api/notification/dividend-announcement';
import {MultiUrlDataSource} from '../../settings/data-source/data-source.type';

export type SetSecuritiesActionArgs = {
  securities: SecurityRead[]
};

export type CreateSecurityActionArgs = {
  security: SecurityCreate
  logo?: File
  historicalSecurityPriceConfig?: HistoricalSecurityPriceConfigCreate
  dividendAnnouncementConfig?: DividendAnnouncementConfigCreate
};

export type LoadSecurityActionArgs = {
  securityId: number
};

export type UpdateSecurityActionArgs = {
  id: number
  values: Omit<SecurityUpdate, 'version'>
};

export type UpdateSecurityLogoActionArgs = {
  id: number
  logo?: File
};

export type LoadHistoricalSecurityPriceConfigActionArgs = {
  securityId: number
};

export type LoadHistoricalSecurityPriceConfigDoneActionArgs = {
  securityId: number
  historicalSecurityPriceConfig?: HistoricalSecurityPriceConfigRead
};

export type UpdateHistoricalSecurityPriceConfigActionArgs = {
  securityId: number
  historicalSecurityPriceConfig: HistoricalSecurityPriceConfigCreate
};

export type UpdateHistoricalSecurityPriceConfigDoneActionArgs = {
  securityId: number
  historicalSecurityPriceConfig?: HistoricalSecurityPriceConfigRead
};

export type LoadHistoricalSecurityPriceDataSourcesDoneActionArgs = {
  dataSources: HistoricalSecurityPriceDataSourceRead[]
};

export type SetHistoricalSecurityPriceDataSourceActionArgs = {
  dataSource: MultiUrlDataSource
  id?: number
};

export type SetHistoricalSecurityPriceDataSourceDoneActionArgs = {
  dataSource?: HistoricalSecurityPriceDataSourceRead
};

export type DeleteHistoricalSecurityPriceDataSourceActionArgs = {
  id: number
};

export type DeleteHistoricalSecurityPriceDataSourceDoneActionArgs = {
  id?: number
}

export const SecurityActions = createActionGroup({
  source: 'Security',
  events: {
    'Set Securities': props<SetSecuritiesActionArgs>(),

    // paginates through all securities and dispatches 'Set Securities' for each page
    'Load All Securities': emptyProps(),

    'Create Security': props<CreateSecurityActionArgs>(),
    'Create Security Success': props<{ security: SecurityRead }>(),
    'Create Security Error': props<CreateSecurityActionArgs>(),

    'Load Security': props<LoadSecurityActionArgs>(),
    'Load Security Success': props<{ security: SecurityRead }>(),
    'Load Security Error': props<LoadSecurityActionArgs>(),

    'Update Security': props<UpdateSecurityActionArgs>(),
    'Update Security Success': props<{ security: SecurityRead }>(),
    'Update Security Error': emptyProps(),

    'Update Security Logo': props<UpdateSecurityLogoActionArgs>(),
    'Update Security Logo Done': emptyProps(),

    'Load Historical Security Price Config': props<LoadHistoricalSecurityPriceConfigActionArgs>(),
    'Load Historical Security Price Config Done': props<LoadHistoricalSecurityPriceConfigDoneActionArgs>(),

    'Load Historical Security Price Data Sources': emptyProps(),
    'Load Historical Security Price Data Sources Done': props<LoadHistoricalSecurityPriceDataSourcesDoneActionArgs>(),

    'Set Historical Security Price Data Source': props<SetHistoricalSecurityPriceDataSourceActionArgs>(),
    'Set Historical Security Price Data Source Done': props<SetHistoricalSecurityPriceDataSourceDoneActionArgs>(),

    'Delete Historical Security Price Data Source': props<DeleteHistoricalSecurityPriceDataSourceActionArgs>(),
    'Delete Historical Security Price Data Source Done': props<DeleteHistoricalSecurityPriceDataSourceDoneActionArgs>(),

    'Update Historical Security Price Config': props<UpdateHistoricalSecurityPriceConfigActionArgs>(),
    'Update Historical Security Price Config Done': props<UpdateHistoricalSecurityPriceConfigDoneActionArgs>()
  }
});
