import {Component, inject} from "@angular/core";
import {TitleToolbarComponent} from "../../../common/components/title-toolbar/title-toolbar.component";
import {DataSourceWithId} from "../data-source.type";
import {Action, Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {WarnIconComponent} from "../../../common/components/warn-icon/warn-icon.component";

@Component({
  selector: "app-delete-data-source-dialog",
  imports: [
    MatButton,
    WarnIconComponent,
    TitleToolbarComponent
  ],
  templateUrl: "./delete-data-source-dialog.component.html",
  styleUrl: "./delete-data-source-dialog.component.scss",
})
export class DeleteDataSourceDialog {

  private readonly dialogData = inject(MAT_DIALOG_DATA);
  readonly dataSource: DataSourceWithId = this.dialogData.dataSource;
  readonly deleteAction: Action = this.dialogData.deleteAction
  private readonly store: Store<AppState> = inject(Store);
  private readonly dialogRef: MatDialogRef<DeleteDataSourceDialog>
    = inject(MatDialogRef<DeleteDataSourceDialog>);

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected delete(): void {
    this.store.dispatch(this.deleteAction);
    this.dialogRef.close();
  }
}
