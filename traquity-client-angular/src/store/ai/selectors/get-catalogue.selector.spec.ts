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
      {...state.catalogue[0], installed: false},
      {...state.catalogue[1], installed: true},
      {...state.catalogue[2], installed: true},
    ]);
  });

  it('marks every entry not installed without the bridge ever having reported state', (): void => {
    expect(getCatalogueSelector(initialState)).toEqual([]);
  });
});
