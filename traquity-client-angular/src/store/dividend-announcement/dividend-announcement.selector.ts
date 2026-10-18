import {createFeatureSelector, createSelector, MemoizedSelector} from '@ngrx/store';
import {DividendAnnouncementDataSourceRead, DividendAnnouncementRead} from '../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementState} from './dividend-announcement.state';
import {AppState, dividendAnnouncementSlice} from '../app.state';
import {DataSourceWithId} from "../../settings/data-source/data-source.type";
import {isAppConfigLoaded} from "../app-config/app-config.selector";
import {getDividendAnnouncementDataSourcesSelector} from "./selectors/get-dividend-announcement-data-sources.selector";
import {getDividendAnnouncementDataSourceSelector} from "./selectors/get-dividend-announcement-data-source.selector";

const dividendAnnouncementSelector: MemoizedSelector<AppState, DividendAnnouncementState>
  = createFeatureSelector<DividendAnnouncementState>(dividendAnnouncementSlice);

// Withheld until the app-config has loaded on purpose (prevents rendering bugs)
export const getNewDividendAnnouncements: MemoizedSelector<AppState, DividendAnnouncementRead[]>
  = createSelector(dividendAnnouncementSelector, isAppConfigLoaded,
  (state: DividendAnnouncementState, appConfigLoaded: boolean): DividendAnnouncementRead[] =>
    appConfigLoaded ? state.dividendAnnouncements.filter((element: DividendAnnouncementRead) => element.isNew) : []);

export const getAllDividendAnnouncements: MemoizedSelector<AppState, DividendAnnouncementRead[]>
  = createSelector(dividendAnnouncementSelector,
  (state: DividendAnnouncementState) => [...state.dividendAnnouncements]);

export const getAllDataSources: MemoizedSelector<AppState, DividendAnnouncementDataSourceRead[]>
  = createSelector(dividendAnnouncementSelector,
  (state: DividendAnnouncementState) => Object.values(state.dataSources));

export const getDividendAnnouncementDataSources: MemoizedSelector<AppState, DataSourceWithId[]>
  = createSelector(dividendAnnouncementSelector, getDividendAnnouncementDataSourcesSelector);

export const getDividendAnnouncementDataSource: (id: number) => MemoizedSelector<AppState, DataSourceWithId | null>
  = (id: number): MemoizedSelector<AppState, DataSourceWithId | null> =>
  createSelector(dividendAnnouncementSelector, (state: DividendAnnouncementState): DataSourceWithId | null =>
    getDividendAnnouncementDataSourceSelector(state, id));
