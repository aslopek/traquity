import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {MatDialog} from "@angular/material/dialog";
import {depotPositionFactory} from "../../../testing/depot-position.factory";
import {PositionGroup} from "../../../store/depot/position-grouping/position-group.type";
import {depotBreakdownDialogData, groupBreakdownDialogData, openPerformanceBreakdownDialog} from "./open-performance-breakdown-dialog";
import {PerformanceBreakdownDialogComponent, PerformanceBreakdownDialogData} from "./performance-breakdown-dialog.component";

describe("groupBreakdownDialogData", () => {
  it("builds the dialog data for a group's breakdown", () => {
    const apple = depotPositionFactory({securityIds: [1], displayName: "Apple Inc."});
    const group: PositionGroup = {
      name: "Technology",
      positions: [apple],
      buyInAbsolute: 1000,
      buyInRelative: 1,
      currentSizeAbsolute: 1200,
      currentSizeRelative: 1,
    };

    expect(groupBreakdownDialogData(group, [7])).toEqual({
      title: group.name,
      depotIds: [7],
      depotPositions: group.positions,
    });
  });
});

describe("depotBreakdownDialogData", () => {
  it("builds the dialog data for the depot selection's breakdown, with no positions to filter by", () => {
    expect(depotBreakdownDialogData([7])).toEqual({
      title: "Depot Performance Breakdown",
      depotIds: [7],
      depotPositions: [],
    });
  });
});

describe("openPerformanceBreakdownDialog", () => {
  let openMock: jest.Mock;
  let dialog: MatDialog;
  let data: PerformanceBreakdownDialogData;

  beforeEach(() => {
    openMock = jest.fn();
    dialog = {open: openMock} as unknown as MatDialog;
    data = depotBreakdownDialogData([7]);
  });

  it("opens the performance breakdown dialog with the given data", () => {
    openPerformanceBreakdownDialog(dialog, data);

    expect(openMock).toHaveBeenCalledWith(PerformanceBreakdownDialogComponent, {
      width: "35%",
      minWidth: "28rem",
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      data,
    });
    expect(openMock).toHaveBeenCalledTimes(1);
  });
});
