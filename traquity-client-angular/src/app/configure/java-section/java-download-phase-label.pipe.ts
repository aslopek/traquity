import {Pipe, PipeTransform} from "@angular/core";
import {JavaDownloadPhase} from "../../../bridge/startup-bridge.type";

/**
 * The caption `app-download-progress` shows instead of its byte-derived line for a phase that carries no byte count.
 * The downloading phase needs none - that phase is exactly where the byte-derived line takes over.
 */
@Pipe({name: "javaDownloadPhaseLabel"})
export class JavaDownloadPhaseLabelPipe implements PipeTransform {

  transform(phase: JavaDownloadPhase): string | undefined {
    switch (phase) {
      case 'verifying':
        return 'Verifying the downloaded archive…';
      case 'extracting':
        return 'Extracting…';
      default:
        return undefined;
    }
  }
}
