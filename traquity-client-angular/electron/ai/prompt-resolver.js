const path = require('node:path');

/**
 * The system prompt for a usecase and a model, resolved out of four layers on every request.
 *
 * Two of them are overrides the user maintains on disk and two ship with the release, and each pair holds a
 * model-specific file and a usecase-wide one. First hit wins:
 *
 *   1. `<overrideDirectory>/<usecase>/<modelKey>.md`
 *   2. `<overrideDirectory>/<usecase>/default.md`
 *   3. `<packagedDirectory>/<usecase>/<modelKey>.md`
 *   4. `<packagedDirectory>/<usecase>/default.md`
 *
 * Layer 4 is what normally makes the resolution total. Only a user removing the packaged default prompt by hand
 * can produce an empty system prompt. If none of the layers are found, no AI model will be prompted.
 *
 * Which layer answered is part of the result, because the failure mode of an override is forgetting one is in
 * place and then debugging the prompt that is not being used.
 */

/**
 * The usecases with a packaged prompt directory. A new one is a new member here and a new directory beside the
 * others; nothing else about this module changes.
 *
 * @typedef {'transaction-extraction'} AiUsecase
 */

/**
 * Which of the four layers answered. `override` and `packaged` name where the file came from, `model` and
 * `default` how specific it was.
 *
 * @typedef {'override-model' | 'override-default' | 'packaged-model' | 'packaged-default'} AiPromptLayer
 */

/**
 * @typedef {{status: 'resolved', prompt: string, layer: AiPromptLayer, filePath: string}
 *   | {status: 'missing', usecase: AiUsecase}} AiPromptResolution
 */

/**
 * The functions this module needs off `fs` - declared minimally.
 *
 * @typedef {Object} PromptFileSystem
 * @property {(path: string) => boolean} existsSync
 * @property {(path: string, encoding: 'utf-8') => string} readFileSync
 */

/**
 * @typedef {Object} PromptResolverOptions
 * @property {string} overrideDirectory the user's own prompt directory - it does not have to exist
 * @property {string} packagedDirectory the prompt directory this release ships
 * @property {PromptFileSystem} fileSystem
 */

/**
 * @typedef {Object} PromptResolver
 * @property {(usecase: AiUsecase, modelKey: string) => AiPromptResolution} resolve
 */

/**
 * The file name of a layer that serves every model of its usecase.
 * @type {string}
 */
const USECASE_WIDE = 'default';

/**
 * @param {PromptResolverOptions} options
 * @returns {PromptResolver}
 */
function createPromptResolver(options) {
  const {overrideDirectory, packagedDirectory, fileSystem} = options;

  /**
   * @param {AiUsecase} usecase
   * @param {string} modelKey
   * @returns {Array<{layer: AiPromptLayer, filePath: string}>} the four candidates, most specific first
   */
  function candidates(usecase, modelKey) {
    return [
      {layer: 'override-model', filePath: path.join(overrideDirectory, usecase, `${modelKey}.md`)},
      {layer: 'override-default', filePath: path.join(overrideDirectory, usecase, `${USECASE_WIDE}.md`)},
      {layer: 'packaged-model', filePath: path.join(packagedDirectory, usecase, `${modelKey}.md`)},
      {layer: 'packaged-default', filePath: path.join(packagedDirectory, usecase, `${USECASE_WIDE}.md`)}
    ];
  }

  /**
   * @param {AiUsecase} usecase
   * @param {string} modelKey a catalogue key, which is also the file name a model-specific layer carries
   * @returns {AiPromptResolution}
   */
  function resolve(usecase, modelKey) {
    for (const candidate of candidates(usecase, modelKey)) {
      if (fileSystem.existsSync(candidate.filePath)) {
        return {
          status: 'resolved',
          prompt: fileSystem.readFileSync(candidate.filePath, 'utf-8'),
          layer: candidate.layer,
          filePath: candidate.filePath
        };
      }
    }
    return {status: 'missing', usecase};
  }

  return {resolve};
}

module.exports = {createPromptResolver};
