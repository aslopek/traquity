/**
 * Probes the machine's GPU backend and VRAM through `node-llama-cpp`.
 */

/** @import {CatalogueEntry} from './catalogue.js' */

/**
 * @typedef {import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).LlamaGpuType} LlamaGpuType
 */

/**
 * @typedef {Object} MachineCapability
 * @property {LlamaGpuType} gpu
 * @property {number} totalVramBytes
 */

/**
 * The subset of `node-llama-cpp`'s `Llama` this module reads.
 *
 * @typedef {Object} LlamaLike
 * @property {LlamaGpuType} gpu
 * @property {() => Promise<{total: number, used: number, free: number, unifiedSize: number}>} getVramState
 */

/**
 * Why a verdict is what it is - carries the figures a rendered reason needs, formatting left to whichever tier
 * presents it.
 *
 * @typedef {{kind: 'probeFailed'} | {kind: 'noGpuBackend'} | {kind: 'unrecognizedBackend'} |
 *   {kind: 'insufficientVram', requiredBytes: number, availableBytes: number}} VerdictReason
 */

/**
 * @typedef {Object} ModelVerdict
 * @property {'ok' | 'unsupported' | 'unknown'} verdict
 * @property {VerdictReason | null} reason null if and only if `verdict === 'ok'`
 */

/**
 * Calls `getLlama()` once and reads `gpu`/`getVramState()` off the result. A rejection or a thrown error
 * is reported as `null` instead of left to propagate.
 *
 * @param {() => Promise<LlamaLike>} getLlama
 * @returns {Promise<MachineCapability | null>}
 */
async function probeMachineCapability(getLlama) {
  try {
    /** @type {LlamaLike} */
    const llama = await getLlama();
    const vramState = await llama.getVramState();
    return {
      gpu: llama.gpu,
      totalVramBytes: vramState.total
    };
  } catch {
    return null;
  }
}

/**
 * @param {CatalogueEntry} entry
 * @param {MachineCapability | null} capability
 * @returns {ModelVerdict}
 */
function verdictFor(entry, capability) {
  if (capability == null) {
    return {verdict: 'unknown', reason: {kind: 'probeFailed'}};
  }

  if (capability.gpu === 'cuda' || capability.gpu === 'metal') {
    return capability.totalVramBytes >= entry.requiredVram
      ? {verdict: 'ok', reason: null}
      : {
        verdict: 'unsupported',
        reason: {kind: 'insufficientVram', requiredBytes: entry.requiredVram, availableBytes: capability.totalVramBytes}
      };
  }

  if (capability.gpu === 'vulkan') {
    return {verdict: 'unsupported', reason: {kind: 'unrecognizedBackend'}};
  }

  return {verdict: 'unsupported', reason: {kind: 'noGpuBackend'}};
}

/**
 * @param {CatalogueEntry[]} entries
 * @param {MachineCapability | null} capability
 * @returns {Record<string, ModelVerdict>} keyed by catalogue key
 */
function verdictsFor(entries, capability) {
  /** @type {Record<string, ModelVerdict>} */
  const verdicts = {};
  for (const entry of entries) {
    verdicts[entry.key] = verdictFor(entry, capability);
  }
  return verdicts;
}

module.exports = {probeMachineCapability, verdictFor, verdictsFor};
