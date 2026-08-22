import {createFeatureSelector, createSelector, MemoizedSelector} from '@ngrx/store';
import {AppState} from '../app.state';
import {AiState} from './ai.state';
import {CatalogueEntryViewModel, getCatalogueSelector} from './selectors/get-catalogue.selector';
import {getIsAiActiveSelector} from './selectors/get-is-ai-active.selector';
import {getIsNoticeConfirmedSelector} from './selectors/get-is-notice-confirmed.selector';

export const aiStore = 'ai';

const aiSelector: MemoizedSelector<AppState, AiState>
  = createFeatureSelector<AiState>(aiStore);

export const getIsNoticeConfirmed: MemoizedSelector<AppState, boolean>
  = createSelector(aiSelector, getIsNoticeConfirmedSelector);

export const getCatalogue: MemoizedSelector<AppState, CatalogueEntryViewModel[]>
  = createSelector(aiSelector, getCatalogueSelector);

export const isAiActive: MemoizedSelector<AppState, boolean>
  = createSelector(aiSelector, getIsAiActiveSelector);
