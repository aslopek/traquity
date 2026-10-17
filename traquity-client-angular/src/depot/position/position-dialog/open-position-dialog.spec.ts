import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {MatDialog} from "@angular/material/dialog";
import {openPositionDialog} from "./open-position-dialog";
import {PositionDialogComponent, PositionDialogData} from "./position-dialog.component";

describe("openPositionDialog", () => {
  let openMock: jest.Mock;
  let dialog: MatDialog;
  let data: PositionDialogData;

  beforeEach(() => {
    openMock = jest.fn();
    dialog = {open: openMock} as unknown as MatDialog;
    data = {
      depotIds: [7],
      securityIds: [1],
      displayName: "Apple Inc."
    };
  });

  it("opens the position dialog with the given data", () => {
    openPositionDialog(dialog, data);

    expect(openMock).toHaveBeenCalledWith(PositionDialogComponent, {
      height: "90%",
      width: "60%",
      minHeight: "15em",
      minWidth: "5em",
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      data,
    });
    expect(openMock).toHaveBeenCalledTimes(1);
  });
});
