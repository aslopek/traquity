import {describe, expect, it} from '@jest/globals';
import {AiDownloadPhaseLabelPipe} from './ai-download-phase-label.pipe';

describe('AiDownloadPhaseLabelPipe', (): void => {
  const pipe: AiDownloadPhaseLabelPipe = new AiDownloadPhaseLabelPipe();

  it('labels the verifying phase', (): void => {
    expect(pipe.transform('verifying')).toBe('Verifying…');
  });

  it('labels the installing phase', (): void => {
    expect(pipe.transform('installing')).toBe('Installing…');
  });

  it('has no label for the downloading phase, so the byte-derived line takes over', (): void => {
    expect(pipe.transform('downloading')).toBeUndefined();
  });
});
