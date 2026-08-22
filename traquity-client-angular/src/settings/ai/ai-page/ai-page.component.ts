import {Component, inject, Signal} from "@angular/core";
import {MatButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatList, MatListItem, MatListItemIcon, MatListItemLine, MatListItemMeta, MatListItemTitle} from "@angular/material/list";
import {Store} from "@ngrx/store";
import {AiActions} from "../../../store/ai/ai.actions";
import {getCatalogue, getIsNoticeConfirmed} from "../../../store/ai/ai.selector";
import {CatalogueEntryViewModel} from "../../../store/ai/selectors/get-catalogue.selector";
import {AppState} from "../../../store/app.state";
import {TqByteSizePipe, TqDecimalPipe} from "../../../common";
import {AiNoticeComponent} from "../ai-notice/ai-notice.component";

@Component({
  selector: "app-ai-page",
  imports: [
    AiNoticeComponent,
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

  protected readonly isConfirmed: Signal<boolean> = this.store.selectSignal(getIsNoticeConfirmed);
  protected readonly catalogue: Signal<CatalogueEntryViewModel[]> = this.store.selectSignal(getCatalogue);

  protected confirm(): void {
    this.store.dispatch(AiActions.confirmAiNotice());
  }
}
