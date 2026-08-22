import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {getCatalogueSelector} from './get-catalogue.selector';
import {initialState} from "../ai.reducer";

describe('getCatalogueSelector', (): void => {
  let state: AiState;

  beforeEach((): void => {
    state = {
      ...initialState,
      catalogue: [
        {key: 'model-a', description: 'Model A', sizeBytes: 4_000_000_000, license: 'Apache-2.0'},
        {key: 'model-b', description: 'Model B', sizeBytes: 2_000_000_000, license: 'MIT'},
        {key: 'model-c', description: 'Model C', sizeBytes: 2_500_000_000, license: 'MIT'},
      ],
      models: {
        'model-b': {path: 'C:\\traquity\\ai\\models\\model-b.gguf', active: true},
        'model-c': {path: 'C:\\traquity\\ai\\models\\model-c.gguf', active: false}
      }
    };
  });

  it('marks each catalogue entry installed if and only if it has a model entry', (): void => {
    expect(getCatalogueSelector(state)).toEqual([
      expect.objectContaining({...state.catalogue[0], installed: false}),
      expect.objectContaining({...state.catalogue[1], installed: true}),
      expect.objectContaining({...state.catalogue[2], installed: true}),
    ]);
  });

  it('marks every entry not installed without the bridge ever having reported state', (): void => {
    expect(getCatalogueSelector(initialState)).toEqual([]);
  });

  it('shows the download button on a not-installed entry when nothing is downloading', (): void => {
    const [modelA] = getCatalogueSelector(state);

    expect(modelA).toEqual(expect.objectContaining({downloading: false, progress: null, showDownloadButton: true}));
  });

  it('never shows the download button on an installed entry', (): void => {
    const [, modelB] = getCatalogueSelector(state);

    expect(modelB.showDownloadButton).toBe(false);
  });

  describe('with a download in progress for one entry', (): void => {
    beforeEach((): void => {
      state = {
        ...state,
        // model-c is not installed here too, so this block has another not-installed entry to assert the hiding on
        models: {'model-b': {path: 'C:\\traquity\\ai\\models\\model-b.gguf', active: true}},
        download: {
          key: 'model-a',
          progress: {phase: 'downloading', receivedBytes: 40, totalBytes: 100, bytesPerSecond: 10, secondsRemaining: 6}
        }
      };
    });

    it('reports that entry as downloading, carrying its progress', (): void => {
      const [modelA] = getCatalogueSelector(state);

      expect(modelA).toEqual(expect.objectContaining({
        downloading: true,
        progress: state.download?.progress,
        showDownloadButton: false
      }));
    });

    it('hides the download button on every other not-installed entry', (): void => {
      const catalogue = getCatalogueSelector(state);
      const otherNotInstalled = catalogue.filter(entry => entry.key !== 'model-a' && !entry.installed);

      expect(otherNotInstalled).not.toEqual([]);
      otherNotInstalled.forEach(entry => expect(entry.showDownloadButton).toBe(false));
    });
  });

  describe('with an error recorded for one entry', (): void => {
    beforeEach((): void => {
      state = {...state, downloadErrors: {'model-a': 'Not enough free disk space in the selected folder'}};
    });

    it('carries that entry\'s error', (): void => {
      const [modelA] = getCatalogueSelector(state);

      expect(modelA.error).toBe('Not enough free disk space in the selected folder');
    });

    it('carries no error for an entry without one', (): void => {
      const [, modelB] = getCatalogueSelector(state);

      expect(modelB.error).toBeNull();
    });
  });
});
