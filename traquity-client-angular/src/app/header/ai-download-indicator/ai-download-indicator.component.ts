import {Component, inject, Signal} from "@angular/core";
import {Store} from "@ngrx/store";
import {AiDownloadPhaseLabelPipe, DownloadProgressComponent} from "../../../common";
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
