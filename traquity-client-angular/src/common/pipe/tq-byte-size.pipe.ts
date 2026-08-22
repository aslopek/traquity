import {Pipe, PipeTransform} from "@angular/core";
import {TqDecimalPipe} from "./tq-decimal.pipe";

const bytesPerMebibyte: number = 2 ** 20;
const bytesPerGibibyte: number = 2 ** 30;

@Pipe({name: "tqByteSize", standalone: true})
export class TqByteSizePipe implements PipeTransform {

  constructor(private readonly tqDecimalPipe: TqDecimalPipe) {
  }

  transform(sizeBytes: number, unit: 'MiB' | 'GiB' = 'MiB', digitsInfo: string = '1.1-1'): string {
    const bytesPerUnit: number = unit === 'GiB' ? bytesPerGibibyte : bytesPerMebibyte;
    return `${this.tqDecimalPipe.transform(sizeBytes / bytesPerUnit, digitsInfo)} ${unit}`;
  }
}
