import {Pipe, PipeTransform} from "@angular/core";
import {ModelVerdict} from "../../../bridge/ai-bridge.type";
import {TqByteSizePipe} from "../../../common";

@Pipe({name: "aiVerdictLabel"})
export class AiVerdictLabelPipe implements PipeTransform {

  constructor(private readonly tqByteSizePipe: TqByteSizePipe) {
  }

  transform(verdict: ModelVerdict | undefined): string | undefined {
    switch (verdict?.reason?.kind) {
      case undefined:
        return undefined;
      case 'probeFailed':
        return 'Not probed';
      case 'noGpuBackend':
        return 'No supported GPU';
      case 'unrecognizedBackend':
        return 'GPU backend unsupported';
      case 'insufficientVram':
        const required: string = this.tqByteSizePipe.transform(verdict.reason.requiredBytes, 'GiB');
        const available: string = this.tqByteSizePipe.transform(verdict.reason.availableBytes, 'GiB');
        return `Needs ${required}, ${available} available`;
    }
  }
}
