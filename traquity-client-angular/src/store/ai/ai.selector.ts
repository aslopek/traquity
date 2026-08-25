import {createFeatureSelector, createSelector, MemoizedSelector} from '@ngrx/store';
import {AppState} from '../app.state';
import {AiState} from './ai.state';
import {ActiveModel, getActiveModelSelector} from './selectors/get-active-model.selector';
import {CatalogueEntryViewModel, getCatalogueSelector} from './selectors/get-catalogue.selector';
import {getIsAiActiveSelector} from './selectors/get-is-ai-active.selector';
import {getIsNoticeConfirmedSelector} from './selectors/get-is-notice-confirmed.selector';
import {getProbeFailedSelector} from './selectors/get-probe-failed.selector';

export const aiStore = 'ai';

const aiSelector: MemoizedSelector<AppState, AiState>
  = createFeatureSelector<AiState>(aiStore);

export const getIsNoticeConfirmed: MemoizedSelector<AppState, boolean>
  = createSelector(aiSelector, getIsNoticeConfirmedSelector);

export const getCatalogue: MemoizedSelector<AppState, CatalogueEntryViewModel[]>
  = createSelector(aiSelector, getCatalogueSelector);

export const isAiActive: MemoizedSelector<AppState, boolean>
  = createSelector(aiSelector, getIsAiActiveSelector);

export const getActiveModel: MemoizedSelector<AppState, ActiveModel | null>
  = createSelector(aiSelector, getActiveModelSelector);

export const isProbeFailed: MemoizedSelector<AppState, boolean>
  = createSelector(aiSelector, getProbeFailedSelector);
