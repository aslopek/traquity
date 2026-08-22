import {Component, computed, input, InputSignal, Signal} from "@angular/core";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {TqByteSizePipe} from "../../pipe/tq-byte-size.pipe";
import {TqDecimalPipe} from "../../pipe/tq-decimal.pipe";
import {TqPercentPipe} from "../../pipe/tq-percent.pipe";
import {DownloadProgressPipe} from "./download-progress.pipe";
import {downloadBarValue, isDownloadIndeterminate} from "./download-progress.util";

@Component({
  selector: "app-download-progress",
  imports: [DownloadProgressPipe, MatProgressBarModule],
  providers: [TqDecimalPipe, TqByteSizePipe, TqPercentPipe],
  templateUrl: "download-progress.component.html",
  styleUrl: "download-progress.component.scss",
})
export class DownloadProgressComponent {

  readonly receivedBytes: InputSignal<number | undefined> = input<number>();
  readonly totalBytes: InputSignal<number | undefined> = input<number>();
  readonly bytesPerSecond: InputSignal<number | undefined> = input<number>();
  readonly secondsRemaining: InputSignal<number | undefined> = input<number>();
  readonly label: InputSignal<string | undefined> = input<string>();

  protected readonly indeterminate: Signal<boolean> = computed((): boolean =>
    isDownloadIndeterminate(this.receivedBytes(), this.totalBytes()));

  protected readonly barValue: Signal<number> = computed((): number =>
    downloadBarValue(this.receivedBytes(), this.totalBytes()));
}
