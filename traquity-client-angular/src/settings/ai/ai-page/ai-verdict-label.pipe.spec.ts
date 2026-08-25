import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {ModelVerdict} from '../../../bridge/ai-bridge.type';
import {TqByteSizePipe} from '../../../common';
import {AiVerdictLabelPipe} from './ai-verdict-label.pipe';

describe('AiVerdictLabelPipe', (): void => {
  let tqByteSizePipe: TqByteSizePipe;
  let pipe: AiVerdictLabelPipe;

  beforeEach((): void => {
    tqByteSizePipe = {transform: jest.fn((bytes: number, unit: string): string => `${bytes} ${unit}`)} as unknown as TqByteSizePipe;
    pipe = new AiVerdictLabelPipe(tqByteSizePipe);
  });

  it('has no label for an ok verdict', (): void => {
    expect(pipe.transform({verdict: 'ok', reason: null})).toBeUndefined();
  });

  it('has no label when the bridge has never reported a verdict for the entry', (): void => {
    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('labels a failed probe', (): void => {
    expect(pipe.transform({verdict: 'unknown', reason: {kind: 'probeFailed'}})).toBe('Not probed');
  });

  it('labels the absence of a gpu backend', (): void => {
    expect(pipe.transform({verdict: 'unsupported', reason: {kind: 'noGpuBackend'}})).toBe('No supported GPU');
  });

  it('labels an unrecognized gpu backend', (): void => {
    expect(pipe.transform({verdict: 'unsupported', reason: {kind: 'unrecognizedBackend'}})).toBe('GPU backend unsupported');
  });

  it('labels insufficient vram with the required and available byte sizes', (): void => {
    const verdict: ModelVerdict = {
      verdict: 'unsupported',
      reason: {kind: 'insufficientVram', requiredBytes: 5_368_709_120, availableBytes: 3_221_225_472}
    };

    expect(pipe.transform(verdict)).toBe('Needs 5368709120 GiB, 3221225472 GiB available');
    expect(tqByteSizePipe.transform).toHaveBeenCalledTimes(2);
    expect(tqByteSizePipe.transform).toHaveBeenNthCalledWith(1, 5_368_709_120, 'GiB');
    expect(tqByteSizePipe.transform).toHaveBeenNthCalledWith(2, 3_221_225_472, 'GiB');
  });
});
