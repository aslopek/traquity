import {MatDialog} from "@angular/material/dialog";
import {PositionGroup} from "../../../store/depot/position-grouping/position-group.type";
import {PerformanceBreakdownDialogComponent, PerformanceBreakdownDialogData} from "./performance-breakdown-dialog.component";

export function openPerformanceBreakdownDialog(dialog: MatDialog, data: PerformanceBreakdownDialogData): void {
  dialog.open(PerformanceBreakdownDialogComponent, {
    width: "35%",
    minWidth: "28rem",
    panelClass: "mat-app-background",
    autoFocus: false,
    disableClose: true,
    data,
  });
}

export function groupBreakdownDialogData(group: PositionGroup, depotIds: number[]): PerformanceBreakdownDialogData {
  return {
    title: group.name,
    depotIds,
    depotPositions: group.positions,
  };
}

export function depotBreakdownDialogData(depotIds: number[]): PerformanceBreakdownDialogData {
  return {
    title: "Depot Performance Breakdown",
    depotIds,
    depotPositions: [],
  };
}
