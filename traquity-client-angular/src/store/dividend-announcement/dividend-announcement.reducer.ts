import {createReducer, on} from '@ngrx/store';
import {DividendAnnouncementDataSourceRead} from '../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementActions} from './dividend-announcement.actions';
import {DividendAnnouncementState} from './dividend-announcement.state';

const initialState: DividendAnnouncementState = {
  dividendAnnouncements: [],
  dataSources: {}
};

export const dividendAnnouncementReducer = createReducer(
  initialState,

  on(DividendAnnouncementActions.loadDividendAnnouncementsSuccess, (state, { dividendAnnouncements }) => {
    return {
      ...state,
      dividendAnnouncements
    };
  }),

  on(DividendAnnouncementActions.loadDividendAnnouncementDataSourcesSuccess, (state, { dataSources }) => {
    const mappedDataSources: { [id: number]: DividendAnnouncementDataSourceRead } = {};
    for (const dataSource of dataSources) {
      mappedDataSources[dataSource.id] = dataSource;
    }
    return {
      ...state,
      dataSources: mappedDataSources,
    };
  }),

  on(DividendAnnouncementActions.setDividendAnnouncementDataSourceDone, (state, {dataSource}) => {
    if (dataSource === undefined) {
      return state;
    }
    const newState: DividendAnnouncementState = {
      ...state,
      dataSources: {
        ...state.dataSources
      }
    };
    newState.dataSources[dataSource.id] = dataSource;
    return newState;
  }),

  on(DividendAnnouncementActions.deleteDividendAnnouncementDataSourceDone, (state, {id}) => {
    if (id === undefined) {
      return state;
    }
    const newState: DividendAnnouncementState = {
      ...state,
      dataSources: {
        ...state.dataSources
      }
    };
    delete newState.dataSources[id];
    return newState;
  }),

  on(DividendAnnouncementActions.markAsReadSuccess, (state, { id }) => {
    const index = state.dividendAnnouncements.findIndex(element => element.id === id);
    if (index === -1) {
      return state;
    }

    const newState: DividendAnnouncementState = {
      ...state,
      dividendAnnouncements: [...state.dividendAnnouncements],
    };
    newState.dividendAnnouncements[index] = {
      ...state.dividendAnnouncements[index],
      isNew: false
    };
    return newState;
  })
);