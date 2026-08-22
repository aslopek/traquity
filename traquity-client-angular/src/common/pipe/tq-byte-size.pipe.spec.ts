import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {TqDecimalPipe} from './tq-decimal.pipe';
import {TqByteSizePipe} from './tq-byte-size.pipe';

describe('TqByteSizePipe', (): void => {
  let tqDecimalPipe: TqDecimalPipe;
  let pipe: TqByteSizePipe;

  beforeEach((): void => {
    tqDecimalPipe = {transform: jest.fn((value: string | number): string => `${value}`)} as unknown as TqDecimalPipe;
    pipe = new TqByteSizePipe(tqDecimalPipe);
  });

  it('formats the byte count as mebibytes with one digit when no unit is given', (): void => {
    pipe.transform(3145728);

    expect(tqDecimalPipe.transform).toHaveBeenCalledTimes(1);
    expect(tqDecimalPipe.transform).toHaveBeenCalledWith(3, '1.1-1');
  });

  it('appends the MiB unit to the formatted value', (): void => {
    expect(pipe.transform(3145728)).toBe('3 MiB');
  });

  it('formats the byte count as gibibytes with one digit when the GiB unit is given', (): void => {
    pipe.transform(3221225472, 'GiB');

    expect(tqDecimalPipe.transform).toHaveBeenCalledTimes(1);
    expect(tqDecimalPipe.transform).toHaveBeenCalledWith(3, '1.1-1');
  });

  it('appends the GiB unit to the formatted value', (): void => {
    expect(pipe.transform(3221225472, 'GiB')).toBe('3 GiB');
  });

  it('passes a given digitsInfo through to the decimal pipe instead of the default', (): void => {
    pipe.transform(3145728, 'MiB', '1.0-0');

    expect(tqDecimalPipe.transform).toHaveBeenCalledTimes(1);
    expect(tqDecimalPipe.transform).toHaveBeenCalledWith(3, '1.0-0');
  });
});
