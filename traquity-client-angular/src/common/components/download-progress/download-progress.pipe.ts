import {Pipe, PipeTransform} from "@angular/core";
import {TqByteSizePipe} from "../../pipe/tq-byte-size.pipe";
import {TqPercentPipe} from "../../pipe/tq-percent.pipe";
import {downloadPercentage} from "./download-progress.util";

/**
 * The one status line of a download: received size, total size, percentage, rate and remaining time, joined with
 * ` · `. Sizes and rate are always MiB, the remaining time always `mm:ss`, and a term whose figure is absent is
 * dropped rather than faked.
 */
@Pipe({name: "downloadProgress"})
export class DownloadProgressPipe implements PipeTransform {

  constructor(private readonly tqByteSizePipe: TqByteSizePipe, private readonly tqPercentPipe: TqPercentPipe) {
  }

  transform(receivedBytes: number | undefined, totalBytes: number | undefined, bytesPerSecond: number | undefined,
            secondsRemaining: number | undefined): string {
    const parts: string[] = [];

    if (totalBytes != null) {
      parts.push(`${this.tqByteSizePipe.transform(receivedBytes ?? 0, 'MiB', '1.0-0')} of `
        + `${this.tqByteSizePipe.transform(totalBytes, 'MiB', '1.0-0')}`);
      if (totalBytes > 0) {
        parts.push(this.tqPercentPipe.transform(downloadPercentage(receivedBytes ?? 0, totalBytes), '1.0-0'));
      }
    } else {
      parts.push(this.tqByteSizePipe.transform(receivedBytes ?? 0, 'MiB', '1.0-0'));
    }

    if (bytesPerSecond != null) {
      parts.push(`${this.tqByteSizePipe.transform(bytesPerSecond)}/s`);
    }

    if (secondsRemaining != null) {
      parts.push(`${this.formatDuration(secondsRemaining)} left`);
    }

    return parts.join(' · ');
  }

  private formatDuration(totalSeconds: number): string {
    const rounded: number = Math.round(totalSeconds);
    const minutes: number = Math.floor(rounded / 60);
    const seconds: number = rounded % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
