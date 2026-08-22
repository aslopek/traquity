import {Pipe, PipeTransform} from "@angular/core";
import {AiDownloadPhase} from "../../../app/startup/startup-bridge.type";

/**
 * The caption `app-download-progress` shows instead of its byte-derived line for a phase that carries no byte count.
 * The downloading phase needs none - that phase is exactly where the byte-derived line takes over.
 */
@Pipe({name: "aiDownloadPhaseLabel"})
export class AiDownloadPhaseLabelPipe implements PipeTransform {

  transform(phase: AiDownloadPhase): string | undefined {
    switch (phase) {
      case 'verifying':
        return 'Verifying…';
      case 'installing':
        return 'Installing…';
      default:
        return undefined;
    }
  }
}
