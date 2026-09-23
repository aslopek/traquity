import {Component, inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {TitleToolbarComponent} from "../../../common/components/title-toolbar/title-toolbar.component";
import {LotViewComponent} from "../lot-view/lot-view.component";

export type LotsDialogData = {
  depotIds: number[];
  securityIds: number[];
};

@Component({
  selector: "app-lots-dialog",
  imports: [TitleToolbarComponent, LotViewComponent],
  templateUrl: "./lots-dialog.component.html",
  styleUrl: "./lots-dialog.component.scss",
})
export class LotsDialogComponent {
  protected readonly dialogData: LotsDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef: MatDialogRef<LotsDialogComponent> =
    inject(MatDialogRef);

  protected close(): void {
    this.dialogRef.close();
  }
}
