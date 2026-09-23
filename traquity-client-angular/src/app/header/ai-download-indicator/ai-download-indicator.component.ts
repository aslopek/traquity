import {Component, inject, Signal} from "@angular/core";
import {Store} from "@ngrx/store";
import {DownloadProgressComponent} from "../../../common/components/download-progress/download-progress.component";
import {AiDownloadPhaseLabelPipe} from "../../../common/pipe/ai-download-phase-label.pipe";
import {getActiveAiDownload} from "../../../store/ai/ai.selector";
import {ActiveAiDownload} from "../../../store/ai/selectors/get-active-ai-download.selector";

@Component({
  selector: "app-ai-download-indicator",
  imports: [
    AiDownloadPhaseLabelPipe,
    DownloadProgressComponent,
  ],
  templateUrl: "ai-download-indicator.component.html",
  styleUrl: "ai-download-indicator.component.scss",
})
export class AiDownloadIndicatorComponent {

  protected readonly activeDownload: Signal<ActiveAiDownload | null> = inject(Store).selectSignal(getActiveAiDownload);
}
