import {Component, inject, Signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatStepperNext} from "@angular/material/stepper";
import {Store} from "@ngrx/store";
import {FileBridgeService} from "../../../../../bridge/file-bridge.service";
import {AppState} from "../../../../../store/app.state";
import {getActiveModel} from "../../../../../store/ai/ai.selector";
import {ActiveModel} from "../../../../../store/ai/selectors/get-active-model.selector";
import {selectedDepotCurrency} from "../../../../../store/depot/depot.selector";
import {PickedFolder, pickedFolderOfFiles} from "../../store/folder/picked-folder-of-files";
import {ReadableTransactionPdfImportStore, TransactionPdfImportStore} from "../../store/transaction-pdf-import.store";

@Component({
  selector: "app-folder-step",
  imports: [MatButtonModule, MatStepperNext, MatIcon],
  templateUrl: "./folder-step.component.html",
  styleUrl: "./folder-step.component.scss"
})
export class FolderStepComponent {
  protected readonly store: ReadableTransactionPdfImportStore = inject(TransactionPdfImportStore);
  private readonly fileBridge: FileBridgeService = inject(FileBridgeService);
  private readonly globalStore: Store<AppState> = inject(Store);
  private readonly depotCurrency: Signal<string> = this.globalStore.selectSignal(selectedDepotCurrency);
  private readonly activeModel: Signal<ActiveModel | null> = this.globalStore.selectSignal(getActiveModel);

  protected selectFolder(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const files: FileList | null = input.files;
    if (files !== null && files.length > 0) {
      const folder: PickedFolder = pickedFolderOfFiles(Array.from(files), (file: File): string => this.fileBridge.pathForFile(file));
      this.store.setFolder(folder);
    }
    input.value = "";
  }

  protected startExtraction(): void {
    this.store.extractFolder({
      currency: this.depotCurrency(),
      modelKey: this.activeModel()?.key ?? ""
    });
  }
}
