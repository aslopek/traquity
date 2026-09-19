const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const path = require('node:path');
const {createPromptResolver} = require('./prompt-resolver.js');

/** @import {AiPromptResolution, PromptFileSystem, PromptResolver} from './prompt-resolver.js' */

const OVERRIDE_DIRECTORY = path.join('/home', 'someone', 'traquity', 'ai', 'prompts');
const PACKAGED_DIRECTORY = path.join('/opt', 'traquity', 'resources', 'prompts');
const USECASE = 'transaction-extraction';
const MODEL_KEY = 'model-a';

const OVERRIDE_MODEL = path.join(OVERRIDE_DIRECTORY, USECASE, `${MODEL_KEY}.md`);
const OVERRIDE_USECASE = path.join(OVERRIDE_DIRECTORY, USECASE, 'default.md');
const PACKAGED_MODEL = path.join(PACKAGED_DIRECTORY, USECASE, `${MODEL_KEY}.md`);
const PACKAGED_USECASE = path.join(PACKAGED_DIRECTORY, USECASE, 'default.md');

describe('createPromptResolver', () => {

  /** @type {jest.Mock<(path: string) => boolean>} */
  let existsSync;
  /** @type {jest.Mock<(path: string, encoding: 'utf-8') => string>} */
  let readFileSync;
  /** @type {string[]} the files that exist, most specific layer first unless a test removes one */
  let presentFiles;
  /** @type {PromptResolver} */
  let subjectUnderTest;

  beforeEach(() => {
    presentFiles = [PACKAGED_USECASE, PACKAGED_MODEL, OVERRIDE_USECASE, OVERRIDE_MODEL];
    existsSync = jest.fn(filePath => presentFiles.includes(filePath));
    readFileSync = jest.fn(filePath => `the content of ${filePath}`);

    /** @type {PromptFileSystem} */
    const fileSystem = {existsSync, readFileSync};
    subjectUnderTest = createPromptResolver({
      overrideDirectory: OVERRIDE_DIRECTORY,
      packagedDirectory: PACKAGED_DIRECTORY,
      fileSystem
    });
  });

  it('answers with the model-specific override where every layer has a file', () => {
    expect(subjectUnderTest.resolve(USECASE, MODEL_KEY)).toEqual({
      status: 'resolved',
      prompt: `the content of ${OVERRIDE_MODEL}`,
      layer: 'override-model',
      filePath: OVERRIDE_MODEL
    });
  });

  it('reads only the layer that answered', () => {
    subjectUnderTest.resolve(USECASE, MODEL_KEY);

    expect(readFileSync).toHaveBeenCalledWith(OVERRIDE_MODEL, 'utf-8');
    expect(readFileSync).toHaveBeenCalledTimes(1);
  });

  it('answers with the usecase-wide override where the model-specific one is absent', () => {
    presentFiles = [PACKAGED_USECASE, PACKAGED_MODEL, OVERRIDE_USECASE];

    expect(subjectUnderTest.resolve(USECASE, MODEL_KEY)).toEqual({
      status: 'resolved',
      prompt: `the content of ${OVERRIDE_USECASE}`,
      layer: 'override-default',
      filePath: OVERRIDE_USECASE
    });
  });

  it('answers with the packaged model-specific file where no override exists', () => {
    presentFiles = [PACKAGED_USECASE, PACKAGED_MODEL];

    expect(subjectUnderTest.resolve(USECASE, MODEL_KEY)).toEqual({
      status: 'resolved',
      prompt: `the content of ${PACKAGED_MODEL}`,
      layer: 'packaged-model',
      filePath: PACKAGED_MODEL
    });
  });

  it('answers with the packaged usecase-wide file as the last layer', () => {
    presentFiles = [PACKAGED_USECASE];

    expect(subjectUnderTest.resolve(USECASE, MODEL_KEY)).toEqual({
      status: 'resolved',
      prompt: `the content of ${PACKAGED_USECASE}`,
      layer: 'packaged-default',
      filePath: PACKAGED_USECASE
    });
  });

  describe('with no layer holding a file', () => {
    beforeEach(() => {
      presentFiles = [];
    });

    it('reports the usecase whose prompt is missing', () => {
      expect(subjectUnderTest.resolve(USECASE, MODEL_KEY)).toEqual({status: 'missing', usecase: USECASE});
    });

    it('reads no file at all', () => {
      subjectUnderTest.resolve(USECASE, MODEL_KEY);

      expect(readFileSync).not.toHaveBeenCalled();
    });

    it('looks for the four layers in order of specificity', () => {
      subjectUnderTest.resolve(USECASE, MODEL_KEY);

      expect(existsSync.mock.calls).toEqual([
        [OVERRIDE_MODEL],
        [OVERRIDE_USECASE],
        [PACKAGED_MODEL],
        [PACKAGED_USECASE]
      ]);
    });
  });

  it('names a model-specific layer after the catalogue key it was asked for', () => {
    const otherKey = 'model-b';
    presentFiles = [path.join(PACKAGED_DIRECTORY, USECASE, `${otherKey}.md`)];

    /** @type {AiPromptResolution} */
    const resolution = subjectUnderTest.resolve(USECASE, otherKey);

    expect(resolution).toEqual({
      status: 'resolved',
      prompt: `the content of ${presentFiles[0]}`,
      layer: 'packaged-model',
      filePath: presentFiles[0]
    });
  });
});
