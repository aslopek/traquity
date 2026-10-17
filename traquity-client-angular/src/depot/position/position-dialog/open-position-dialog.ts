import {MatDialog} from "@angular/material/dialog";
import {PositionDialogComponent, PositionDialogData} from "./position-dialog.component";

export function openPositionDialog(dialog: MatDialog, data: PositionDialogData): void {
  dialog.open(PositionDialogComponent, {
    height: "90%",
    width: "60%",
    minHeight: "15em",
    minWidth: "5em",
    panelClass: "mat-app-background",
    autoFocus: false,
    disableClose: true,
    data,
  });
}
