const {describe, expect, it} = require('@jest/globals');
const {CATALOGUE, catalogueEntries} = require('./catalogue.js');

describe('catalogueEntries', () => {
  it('projects every catalogue entry to key, description, sizeBytes and license only', () => {
    expect(catalogueEntries()).toEqual(Object.values(CATALOGUE).map(({key, description, sizeBytes, license}) =>
      ({key, description, sizeBytes, license})));
  });

  it('carries none of the internal fields needed only to build a download request', () => {
    for (const entry of catalogueEntries()) {
      expect(entry).not.toHaveProperty('repo');
      expect(entry).not.toHaveProperty('revision');
      expect(entry).not.toHaveProperty('file');
      expect(entry).not.toHaveProperty('sha256');
    }
  });
});
