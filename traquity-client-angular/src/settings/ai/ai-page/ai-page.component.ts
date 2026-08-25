import {Component, inject, Signal} from "@angular/core";
import {MatButton} from "@angular/material/button";
import {MatCard, MatCardContent} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {Store} from "@ngrx/store";
import {DownloadProgressComponent, TqByteSizePipe, TqDecimalPipe} from "../../../common";
import {AiActions} from "../../../store/ai/ai.actions";
import {getCatalogue, getIsNoticeConfirmed, isProbeFailed} from "../../../store/ai/ai.selector";
import {CatalogueEntryViewModel} from "../../../store/ai/selectors/get-catalogue.selector";
import {AppState} from "../../../store/app.state";
import {RemoveModelDialog, RemoveModelDialogData} from "../remove-model-dialog/remove-model-dialog.component";
import {AiDownloadPhaseLabelPipe} from "./ai-download-phase-label.pipe";
import {AiNoticeComponent} from "../ai-notice/ai-notice.component";
import {AiVerdictLabelPipe} from "./ai-verdict-label.pipe";

@Component({
  selector: "app-ai-page",
  imports: [
    AiDownloadPhaseLabelPipe,
    AiNoticeComponent,
    AiVerdictLabelPipe,
    DownloadProgressComponent,
    MatButton,
    MatCard,
    MatCardContent,
    TqByteSizePipe,
  ],
  providers: [TqDecimalPipe, TqByteSizePipe],
  templateUrl: "./ai-page.component.html",
  styleUrl: "./ai-page.component.scss",
})
export class AiPageComponent {

  private readonly store: Store<AppState> = inject(Store);
  private readonly dialog: MatDialog = inject(MatDialog);

  protected readonly isConfirmed: Signal<boolean> = this.store.selectSignal(getIsNoticeConfirmed);
  protected readonly catalogue: Signal<CatalogueEntryViewModel[]> = this.store.selectSignal(getCatalogue);
  protected readonly probeFailed: Signal<boolean> = this.store.selectSignal(isProbeFailed);

  protected confirm(): void {
    this.store.dispatch(AiActions.confirmAiNotice());
  }

  protected download(key: string): void {
    this.store.dispatch(AiActions.downloadModel({key}));
  }

  protected activate(key: string): void {
    this.store.dispatch(AiActions.activateModel({key}));
  }

  protected openRemoveDialog(entry: CatalogueEntryViewModel): void {
    this.dialog.open(RemoveModelDialog, {
      width: "30%",
      minWidth: "25em",
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      data: {key: entry.key, description: entry.description} satisfies RemoveModelDialogData
    });
  }
}
