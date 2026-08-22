import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {TqByteSizePipe} from '../../pipe/tq-byte-size.pipe';
import {TqPercentPipe} from '../../pipe/tq-percent.pipe';
import {DownloadProgressPipe} from './download-progress.pipe';
import {downloadPercentage} from './download-progress.util';

jest.mock('./download-progress.util', () => ({
  downloadPercentage: jest.fn()
}));

const MIB: number = 1024 * 1024;

type DownloadPercentage = (receivedBytes: number | undefined, totalBytes: number | undefined) => number;
type TqByteSizeTransform = (sizeBytes: number, unit?: 'MiB' | 'GiB', digitsInfo?: string) => string;
type TqPercentTransform = (value: number, digitsInfo: string) => string;

describe('DownloadProgressPipe', (): void => {
  let pipe: DownloadProgressPipe;
  let downloadPercentageMock: jest.Mock<DownloadPercentage>;
  let tqByteSizeTransformMock: jest.Mock<TqByteSizeTransform>;
  let tqPercentTransformMock: jest.Mock<TqPercentTransform>;

  beforeEach((): void => {
    downloadPercentageMock = downloadPercentage as jest.Mock<DownloadPercentage>;
    downloadPercentageMock.mockReset();
    // deliberately not the fraction the figures below work out to, so a term rendered from the pipe's own arithmetic
    // instead of from the collaborator fails these assertions
    downloadPercentageMock.mockReturnValue(0.42);

    // each mock renders its arguments back verbatim (sizes as a MiB count, for readable expected strings), so an
    // assertion on the composed string still pins down what the pipe handed to its collaborators, without
    // duplicating TqByteSizePipe/TqPercentPipe's own formatting logic
    tqByteSizeTransformMock = jest.fn((sizeBytes: number, unit: 'MiB' | 'GiB' = 'MiB', digitsInfo: string = '1.1-1'): string =>
      `${sizeBytes / MIB}${unit}(${digitsInfo})`);
    tqPercentTransformMock = jest.fn((value: number, digitsInfo: string): string => `${value}(${digitsInfo})%`);

    pipe = new DownloadProgressPipe(
      {transform: tqByteSizeTransformMock} as unknown as TqByteSizePipe,
      {transform: tqPercentTransformMock} as unknown as TqPercentPipe
    );
  });

  it('renders received size, total size, percentage, rate and remaining time', (): void => {
    const receivedBytes: number = 118 * MIB;
    const totalBytes: number = 188 * MIB;
    const bytesPerSecond: number = 4 * MIB;

    expect(pipe.transform(receivedBytes, totalBytes, bytesPerSecond, 17))
      .toBe('118MiB(1.0-0) of 188MiB(1.0-0) · 0.42(1.0-0)% · 4MiB(1.1-1)/s · 00:17 left');
  });

  it('passes received and total size to the byte-size pipe as whole MiB with no decimal places', (): void => {
    const receivedBytes: number = 118 * MIB;
    const totalBytes: number = 188 * MIB;

    pipe.transform(receivedBytes, totalBytes, undefined, undefined);

    expect(tqByteSizeTransformMock.mock.calls).toEqual([[receivedBytes, 'MiB', '1.0-0'], [totalBytes, 'MiB', '1.0-0']]);
  });

  it('passes the rate to the byte-size pipe using its own default unit and digitsInfo', (): void => {
    const receivedBytes: number = 10 * MIB;
    const bytesPerSecond: number = 1.25 * MIB;

    pipe.transform(receivedBytes, undefined, bytesPerSecond, undefined);

    expect(tqByteSizeTransformMock).toHaveBeenLastCalledWith(bytesPerSecond);
  });

  it('renders the percentage of the figures it was given', (): void => {
    const receivedBytes: number = 118 * MIB;
    const totalBytes: number = 188 * MIB;

    pipe.transform(receivedBytes, totalBytes, undefined, undefined);

    expect(downloadPercentageMock).toHaveBeenCalledTimes(1);
    expect(downloadPercentageMock).toHaveBeenCalledWith(receivedBytes, totalBytes);
  });

  it('passes the fraction downloadPercentage computed straight to the percent pipe', (): void => {
    downloadPercentageMock.mockReturnValue(0.75);

    pipe.transform(10 * MIB, 20 * MIB, undefined, undefined);

    expect(tqPercentTransformMock).toHaveBeenCalledTimes(1);
    expect(tqPercentTransformMock).toHaveBeenCalledWith(0.75, '1.0-0');
  });

  it('drops the total size and percentage when the total is unknown', (): void => {
    const receivedBytes: number = 10 * MIB;
    const bytesPerSecond: number = MIB;

    expect(pipe.transform(receivedBytes, undefined, bytesPerSecond, 5)).toBe('10MiB(1.0-0) · 1MiB(1.1-1)/s · 00:05 left');
    expect(downloadPercentageMock).not.toHaveBeenCalled();
    expect(tqPercentTransformMock).not.toHaveBeenCalled();
  });

  it('drops the percentage for a zero total, rather than rendering the zero it would compute', (): void => {
    const receivedBytes: number = 10 * MIB;
    const bytesPerSecond: number = MIB;

    expect(pipe.transform(receivedBytes, 0, bytesPerSecond, 5)).toBe('10MiB(1.0-0) of 0MiB(1.0-0) · 1MiB(1.1-1)/s · 00:05 left');
    expect(downloadPercentageMock).not.toHaveBeenCalled();
    expect(tqPercentTransformMock).not.toHaveBeenCalled();
  });

  it('drops the remaining time when it is unknown', (): void => {
    const receivedBytes: number = 10 * MIB;
    const totalBytes: number = 20 * MIB;
    const bytesPerSecond: number = 1 * MIB;

    expect(pipe.transform(receivedBytes, totalBytes, bytesPerSecond, undefined))
      .toBe('10MiB(1.0-0) of 20MiB(1.0-0) · 0.42(1.0-0)% · 1MiB(1.1-1)/s');
  });

  it('drops the rate when it is unknown', (): void => {
    const receivedBytes: number = 10 * MIB;
    const totalBytes: number = 20 * MIB;

    expect(pipe.transform(receivedBytes, totalBytes, undefined, undefined)).toBe('10MiB(1.0-0) of 20MiB(1.0-0) · 0.42(1.0-0)%');
  });

  it('zero-pads minutes and seconds under ten', (): void => {
    const receivedBytes: number = 0;

    expect(pipe.transform(receivedBytes, undefined, undefined, 65)).toBe('0MiB(1.0-0) · 01:05 left');
  });

  it('formats a remaining time over an hour as minutes:seconds, not hours', (): void => {
    const receivedBytes: number = 0;

    expect(pipe.transform(receivedBytes, undefined, undefined, 7200)).toBe('0MiB(1.0-0) · 120:00 left');
  });

  it('treats a missing received byte count as zero', (): void => {
    expect(pipe.transform(undefined, undefined, undefined, undefined)).toBe('0MiB(1.0-0)');
  });
});
