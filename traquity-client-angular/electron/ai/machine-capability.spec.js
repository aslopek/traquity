const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {probeMachineCapability, verdictFor, verdictsFor} = require('./machine-capability.js');

/** @import {CatalogueEntry} from './catalogue.js' */
/** @import {LlamaLike, MachineCapability} from './machine-capability.js' */

describe('probeMachineCapability', () => {
  /** @type {jest.Mock<() => Promise<LlamaLike>>} */
  const getLlama = jest.fn();
  /** @type {jest.Mock<LlamaLike['getVramState']>} */
  const getVramState = jest.fn();

  /** @type {Awaited<ReturnType<LlamaLike['getVramState']>>} */
  let vramState;

  beforeEach(() => {
    jest.clearAllMocks();
    vramState = {
      total: 8_000_000_000,
      used: 1_000_000_000,
      free: 7_000_000_000,
      unifiedSize: 12_000_000_000
    };
    getVramState.mockResolvedValue(vramState);
    getLlama.mockResolvedValue({gpu: 'cuda', getVramState});
  });

  it('reports the gpu backend and the vram state the llama binding resolved', async () => {
    await expect(probeMachineCapability(getLlama)).resolves
      .toEqual({gpu: 'cuda', totalVramBytes: vramState.total});
  });

  it('reports null when getLlama rejects', async () => {
    getLlama.mockRejectedValue(new Error('No prebuilt binary for this platform'));

    await expect(probeMachineCapability(getLlama)).resolves.toBeNull();
  });

  it('reports null when getVramState rejects', async () => {
    getVramState.mockRejectedValue(new Error('driver refused to initialize'));

    await expect(probeMachineCapability(getLlama)).resolves.toBeNull();
  });
});

describe('verdictFor', () => {
  /** @type {CatalogueEntry} */
  let entry;
  /** @type {MachineCapability} */
  let capability;

  beforeEach(() => {
    entry = {
      key: 'model-a',
      description: 'Model A',
      sizeBytes: 3_013_027_808,
      license: 'Apache-2.0',
      requiredVram: 5_000_000_000
    };
    // free vram exactly at the requirement, so the baseline pins the boundary of the comparison
    capability = {gpu: 'cuda', totalVramBytes: 8_000_000_000};
  });

  it('verdicts ok on cuda with free vram at the requirement', () => {
    expect(verdictFor(entry, capability)).toEqual({verdict: 'ok', reason: null});
  });

  it('verdicts ok on metal', () => {
    capability.gpu = 'metal';

    expect(verdictFor(entry, capability)).toEqual({verdict: 'ok', reason: null});
  });

  it('verdicts unsupported one byte below the requirement, the reason carrying required and available bytes', () => {
    capability.totalVramBytes = entry.requiredVram - 1;

    expect(verdictFor(entry, capability)).toEqual({
      verdict: 'unsupported',
      reason: {kind: 'insufficientVram', requiredBytes: entry.requiredVram, availableBytes: capability.totalVramBytes}
    });
  });

  it('verdicts unsupported on vulkan even with free vram at the requirement', () => {
    capability.gpu = 'vulkan';

    expect(verdictFor(entry, capability)).toEqual({verdict: 'unsupported', reason: {kind: 'unrecognizedBackend'}});
  });

  it('verdicts unsupported with no gpu backend at all', () => {
    capability.gpu = false;

    expect(verdictFor(entry, capability)).toEqual({verdict: 'unsupported', reason: {kind: 'noGpuBackend'}});
  });

  it('verdicts unknown when the probe failed', () => {
    expect(verdictFor(entry, null)).toEqual({verdict: 'unknown', reason: {kind: 'probeFailed'}});
  });
});

describe('verdictsFor', () => {
  /** @type {CatalogueEntry} */
  let smallEntry;
  /** @type {CatalogueEntry} */
  let largeEntry;
  /** @type {CatalogueEntry[]} */
  let entries;
  /** @type {MachineCapability} */
  let capability;

  beforeEach(() => {
    smallEntry = {
      key: 'model-a',
      description: 'Model A',
      sizeBytes: 1_280_835_840,
      license: 'Apache-2.0',
      requiredVram: 3_000_000_000
    };
    largeEntry = {
      key: 'model-b',
      description: 'Model B',
      sizeBytes: 6_169_341_984,
      license: 'Apache-2.0',
      requiredVram: 11_000_000_000
    };
    entries = [smallEntry, largeEntry];
    capability = {gpu: 'cuda', totalVramBytes: 8_000_000_000};
  });

  it('keys each entry\'s own verdict by its catalogue key', () => {
    expect(verdictsFor(entries, capability)).toEqual({
      [smallEntry.key]: {verdict: 'ok', reason: null},
      [largeEntry.key]: {
        verdict: 'unsupported',
        reason: {
          kind: 'insufficientVram',
          requiredBytes: largeEntry.requiredVram,
          availableBytes: capability.totalVramBytes
        }
      }
    });
  });

  it('keys every entry as unsupported with vulkan backend', () => {
    capability.gpu = 'vulkan';

    expect(verdictsFor(entries, capability)).toEqual({
      [smallEntry.key]: {verdict: 'unsupported', reason: {kind: 'unrecognizedBackend'}},
      [largeEntry.key]: {verdict: 'unsupported', reason: {kind: 'unrecognizedBackend'}},
    });
  });

  it('keys every entry as unsupported with no gpu backend at all', () => {
    capability.gpu = false;

    expect(verdictsFor(entries, capability)).toEqual({
      [smallEntry.key]: {verdict: 'unsupported', reason: {kind: 'noGpuBackend'}},
      [largeEntry.key]: {verdict: 'unsupported', reason: {kind: 'noGpuBackend'}}
    });
  });

  it('keys every entry as unknown when the probe failed', () => {
    expect(verdictsFor(entries, null)).toEqual({
      [smallEntry.key]: {verdict: 'unknown', reason: {kind: 'probeFailed'}},
      [largeEntry.key]: {verdict: 'unknown', reason: {kind: 'probeFailed'}}
    });
  });

  it('reports an empty map for an empty catalogue', () => {
    entries = [];

    expect(verdictsFor(entries, capability)).toEqual({});
  });
});
