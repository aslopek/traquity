import {Component, inject, Signal} from "@angular/core";
import {MatButton} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatIcon} from "@angular/material/icon";
import {MatList, MatListItem, MatListItemIcon, MatListItemLine, MatListItemMeta, MatListItemTitle} from "@angular/material/list";
import {Store} from "@ngrx/store";
import {DownloadProgressComponent, TqByteSizePipe, TqDecimalPipe} from "../../../common";
import {AiActions} from "../../../store/ai/ai.actions";
import {getCatalogue, getIsNoticeConfirmed} from "../../../store/ai/ai.selector";
import {CatalogueEntryViewModel} from "../../../store/ai/selectors/get-catalogue.selector";
import {AppState} from "../../../store/app.state";
import {AiNoticeComponent} from "../ai-notice/ai-notice.component";
import {RemoveModelDialog, RemoveModelDialogData} from "../remove-model-dialog/remove-model-dialog.component";
import {AiDownloadPhaseLabelPipe} from "./ai-download-phase-label.pipe";

@Component({
  selector: "app-ai-page",
  imports: [
    AiDownloadPhaseLabelPipe,
    AiNoticeComponent,
    DownloadProgressComponent,
    MatButton,
    MatIcon,
    MatList,
    MatListItem,
    MatListItemIcon,
    MatListItemLine,
    MatListItemMeta,
    MatListItemTitle,
    TqByteSizePipe,
  ],
  providers: [TqDecimalPipe],
  templateUrl: "./ai-page.component.html",
  styleUrl: "./ai-page.component.scss",
})
export class AiPageComponent {

  private readonly store: Store<AppState> = inject(Store);
  private readonly dialog: MatDialog = inject(MatDialog);

  protected readonly isConfirmed: Signal<boolean> = this.store.selectSignal(getIsNoticeConfirmed);
  protected readonly catalogue: Signal<CatalogueEntryViewModel[]> = this.store.selectSignal(getCatalogue);

  protected confirm(): void {
    this.store.dispatch(AiActions.confirmAiNotice());
  }

  protected download(key: string): void {
    this.store.dispatch(AiActions.downloadModel({key}));
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
