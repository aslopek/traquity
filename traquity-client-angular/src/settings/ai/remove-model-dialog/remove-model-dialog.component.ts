import {Component, inject} from "@angular/core";
import {MatButton} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {Store} from "@ngrx/store";
import {TitleToolbarComponent} from "../../../common";
import {AiActions} from "../../../store/ai/ai.actions";
import {AppState} from "../../../store/app.state";

export type RemoveModelDialogData = {
  key: string
  description: string
};

@Component({
  selector: "app-remove-model-dialog",
  imports: [
    MatButton,
    TitleToolbarComponent
  ],
  templateUrl: "./remove-model-dialog.component.html",
  styleUrl: "./remove-model-dialog.component.scss",
})
export class RemoveModelDialog {

  private readonly store: Store<AppState> = inject(Store);
  private readonly dialogRef: MatDialogRef<RemoveModelDialog> = inject(MatDialogRef<RemoveModelDialog>);
  private readonly dialogData: RemoveModelDialogData = inject(MAT_DIALOG_DATA);

  protected readonly description: string = this.dialogData.description;

  protected confirm(): void {
    this.store.dispatch(AiActions.removeModel({key: this.dialogData.key}));
    this.dialogRef.close();
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
